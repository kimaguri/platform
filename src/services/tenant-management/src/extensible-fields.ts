import { getActiveTenants, checkAdminConnection } from '../../../lib/adminDb/client';
import { createClient } from '@supabase/supabase-js';
import { getAdminSupabaseUrl, getAdminSupabaseServiceKey } from '../service';

/**
 * Extensible Fields Management в Tenant Management Service
 * Все операции с метаданными полей в админской БД
 * Функциональный подход - только функции, без классов
 */

// Типы для расширяемых полей
export interface ExtensionFieldDefinition {
  id: number;
  tenant_id: string;
  entity_table: string;
  field_name: string;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select' | 'multiselect';
  display_name: string;
  description?: string;
  is_required: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  is_sortable: boolean;
  default_value?: string;
  validation_rules?: Record<string, any>;
  ui_config?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtensionFieldsCache {
  [key: string]: ExtensionFieldDefinition[]; // key = "tenantId:entityTable"
}

// Кеш для метаданных полей из админской БД
const adminFieldDefinitionsCache = new Map<
  string,
  { data: ExtensionFieldDefinition[]; timestamp: number }
>();
const ADMIN_CACHE_TTL = 10 * 60 * 1000; // 10 минут для админских данных

/**
 * Получение клиента админской БД
 */
function getAdminClient() {
  console.log('[ExtensibleFields] getAdminClient called');
  
  // Get admin database credentials from service secrets
  const adminUrl = getAdminSupabaseUrl();
  const adminServiceKey = getAdminSupabaseServiceKey();

  console.log('[ExtensibleFields] Config values:', { 
    adminUrl, 
    hasServiceKey: !!adminServiceKey,
    serviceKeyLength: adminServiceKey?.length 
  });

  if (!adminUrl || !adminServiceKey) {
    console.error('[ExtensibleFields] Missing admin config:', { adminUrl: !!adminUrl, adminServiceKey: !!adminServiceKey });
    throw new Error('Admin Supabase configuration not found');
  }

  console.log('[ExtensibleFields] Creating Supabase client...');
  console.log('[ExtensibleFields] createClient function:', typeof createClient);
  
  const client = createClient(adminUrl, adminServiceKey);
  console.log('[ExtensibleFields] Created client:', { client: !!client, clientType: typeof client });
  
  if (!client) {
    throw new Error('Failed to create Supabase client');
  }
  
  return client;
}

/**
 * Поддерживаемые сущности для расширяемых полей
 */
export const SUPPORTED_ENTITIES = [
  'lead',
  'clients',
  'projects',
  'activities',
  'employee',
] as const;

export type SupportedEntity = (typeof SUPPORTED_ENTITIES)[number];

/**
 * Проверка, поддерживает ли сущность расширяемые поля
 */
export function isSupportedEntity(entityTable: string): entityTable is SupportedEntity {
  return SUPPORTED_ENTITIES.includes(entityTable as SupportedEntity);
}

/**
 * Получение определений полей для тенанта и сущности из админской БД
 */
export async function getFieldDefinitionsForTenant(
  tenantId: string,
  entityTable: string
): Promise<ExtensionFieldDefinition[]> {
  console.log('[ExtensibleFields] getFieldDefinitionsForTenant called:', { tenantId, entityTable });
  
  const cacheKey = `${tenantId}:${entityTable}`;

  // Проверяем кеш
  const cached = adminFieldDefinitionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp <= ADMIN_CACHE_TTL) {
    console.log('[ExtensibleFields] Returning cached data:', cached.data.length, 'items');
    return cached.data;
  }

  console.log('[ExtensibleFields] Cache miss, fetching from admin DB...');
  
  // Получаем админский клиент
  const adminClient = getAdminClient();
  console.log('[ExtensibleFields] Got admin client, executing query...');

  let data, error;
  
  try {
    // Загружаем определения полей из админской БД
    const result = await adminClient
      .from('extension_field_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_table', entityTable)
      .eq('is_active', true)
      .order('display_name');
      
    data = result.data;
    error = result.error;
      
    console.log('[ExtensibleFields] Query executed:', { data: !!data, error: !!error, dataLength: data?.length });
    
    if (error) {
      console.error('[ExtensibleFields] Query error:', error);
      throw new Error(
        `Failed to load field definitions from admin DB for ${tenantId}:${entityTable}: ${error.message}`
      );
    }
  } catch (queryError) {
    console.error('[ExtensibleFields] Query execution failed:', queryError);
    throw queryError;
  }

  const definitions = data || [];

  // Сохраняем в кеш
  adminFieldDefinitionsCache.set(cacheKey, {
    data: definitions,
    timestamp: Date.now(),
  });

  return definitions;
}

/**
 * Получение всех определений полей для тенанта из админской БД
 */
export async function getAllFieldDefinitionsForTenant(
  tenantId: string
): Promise<Record<string, ExtensionFieldDefinition[]>> {
  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from('extension_field_definitions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('entity_table, display_name');

  if (error) {
    throw new Error(
      `Failed to load all field definitions for tenant ${tenantId}: ${error.message}`
    );
  }

  // Группируем по entity_table
  const result: Record<string, ExtensionFieldDefinition[]> = {};
  if (data) {
    data.forEach((definition: any) => {
      if (!result[definition.entity_table]) {
        result[definition.entity_table] = [];
      }
      result[definition.entity_table].push(definition);
    });
  }

  // Кешируем каждую сущность отдельно
  Object.entries(result).forEach(([entityTable, definitions]) => {
    const cacheKey = `${tenantId}:${entityTable}`;
    adminFieldDefinitionsCache.set(cacheKey, {
      data: definitions,
      timestamp: Date.now(),
    });
  });

  return result;
}

/**
 * Создание нового определения поля в админской БД
 */
export async function createFieldDefinition(
  tenantId: string,
  fieldDefinition: Omit<ExtensionFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<ExtensionFieldDefinition> {
  // Проверяем поддержку сущности
  if (!isSupportedEntity(fieldDefinition.entity_table)) {
    throw new Error(
      `Entity '${
        fieldDefinition.entity_table
      }' does not support extensible fields. Supported entities: ${SUPPORTED_ENTITIES.join(', ')}`
    );
  }

  const adminClient = getAdminClient();

  const insertData = {
    ...fieldDefinition,
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('[ExtensibleFields] Inserting data:', insertData);

  // First, let's check if the table exists by trying to select from it
  console.log('[ExtensibleFields] Testing table existence...');
  const { data: testData, error: testError } = await adminClient
    .from('extension_field_definitions')
    .select('count')
    .limit(1);
  
  console.log('[ExtensibleFields] Table test result:', { testData, testError });

  const { data, error } = await adminClient
    .from('extension_field_definitions')
    .insert(insertData)
    .select()
    .single();

  console.log('[ExtensibleFields] Supabase response:', { data, error });

  if (error) {
    console.error('[ExtensibleFields] Supabase error:', error);
    const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown Supabase error';
    throw new Error(`Failed to create field definition: ${errorMessage}`);
  }

  if (!data) {
    console.error('[ExtensibleFields] No data returned from Supabase');
    throw new Error('Failed to create field definition: No data returned from database');
  }

  console.log('[ExtensibleFields] Successfully created field:', data);

  // Инвалидируем кеш для этой сущности
  invalidateCache(tenantId, fieldDefinition.entity_table);

  return data;
}

/**
 * Обновление определения поля в админской БД
 */
export async function updateFieldDefinition(
  fieldId: number,
  updates: Partial<Omit<ExtensionFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<ExtensionFieldDefinition> {
  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from('extension_field_definitions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fieldId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update field definition: ${error.message}`);
  }

  // Инвалидируем кеш для этой сущности
  invalidateCache(data.tenant_id, data.entity_table);

  return data;
}

/**
 * Удаление определения поля (мягкое удаление - is_active = false)
 */
export async function deleteFieldDefinition(fieldId: number): Promise<void> {
  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from('extension_field_definitions')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fieldId)
    .select('tenant_id, entity_table')
    .single();

  if (error) {
    throw new Error(`Failed to delete field definition: ${error.message}`);
  }

  // Инвалидируем кеш для этой сущности
  if (data) {
    invalidateCache(data.tenant_id, data.entity_table);
  }
}

/**
 * Получение списка всех тенантов с расширяемыми полями
 */
export async function getTenantsWithExtensibleFields(): Promise<string[]> {
  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from('extension_field_definitions')
    .select('tenant_id')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to get tenants with extensible fields: ${error.message}`);
  }

  // Возвращаем уникальные tenant_id
  const uniqueTenants = [...new Set((data || []).map((item: any) => item.tenant_id))];
  return uniqueTenants;
}

/**
 * Получение статистики использования расширяемых полей по тенантам
 */
export async function getExtensibleFieldsStats(): Promise<{
  totalTenants: number;
  totalFields: number;
  fieldsByTenant: Record<string, number>;
  fieldsByEntity: Record<string, number>;
}> {
  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from('extension_field_definitions')
    .select('tenant_id, entity_table')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to get extensible fields stats: ${error.message}`);
  }

  const stats = {
    totalTenants: 0,
    totalFields: data?.length || 0,
    fieldsByTenant: {} as Record<string, number>,
    fieldsByEntity: {} as Record<string, number>,
  };

  (data || []).forEach((item: any) => {
    // Подсчет по тенантам
    stats.fieldsByTenant[item.tenant_id] = (stats.fieldsByTenant[item.tenant_id] || 0) + 1;

    // Подсчет по сущностям
    stats.fieldsByEntity[item.entity_table] = (stats.fieldsByEntity[item.entity_table] || 0) + 1;
  });

  stats.totalTenants = Object.keys(stats.fieldsByTenant).length;

  return stats;
}

/**
 * Валидация определения поля
 */
export function validateFieldDefinition(fieldDefinition: Partial<ExtensionFieldDefinition>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Проверка обязательных полей
  if (!fieldDefinition.entity_table) {
    errors.push('entity_table is required');
  } else if (!isSupportedEntity(fieldDefinition.entity_table)) {
    errors.push(
      `entity_table '${
        fieldDefinition.entity_table
      }' is not supported. Supported entities: ${SUPPORTED_ENTITIES.join(', ')}`
    );
  }

  if (!fieldDefinition.field_name) {
    errors.push('field_name is required');
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldDefinition.field_name)) {
    errors.push(
      'field_name must be a valid identifier (letters, numbers, underscore, start with letter or underscore)'
    );
  }

  if (!fieldDefinition.field_type) {
    errors.push('field_type is required');
  } else if (
    !['text', 'number', 'boolean', 'date', 'json', 'select'].includes(fieldDefinition.field_type)
  ) {
    errors.push('field_type must be one of: text, number, boolean, date, json, select');
  }

  if (!fieldDefinition.display_name) {
    errors.push('display_name is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Инвалидация кеша
 */
export function invalidateCache(tenantId?: string, entityTable?: string): void {
  if (tenantId && entityTable) {
    adminFieldDefinitionsCache.delete(`${tenantId}:${entityTable}`);
  } else if (tenantId) {
    // Удаляем все записи для тенанта
    const keysToDelete = Array.from(adminFieldDefinitionsCache.keys()).filter((key) =>
      key.startsWith(`${tenantId}:`)
    );
    keysToDelete.forEach((key) => adminFieldDefinitionsCache.delete(key));
  } else {
    adminFieldDefinitionsCache.clear();
  }
}

/**
 * Получение статистики кеша
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: adminFieldDefinitionsCache.size,
    entries: Array.from(adminFieldDefinitionsCache.keys()),
  };
}

/**
 * Проверка подключения к админской БД
 */
export async function checkExtensibleFieldsConnection(): Promise<boolean> {
  try {
    const adminClient = getAdminClient();
    const { error } = await adminClient.from('extension_field_definitions').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
