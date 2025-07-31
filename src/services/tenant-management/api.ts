import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../../gateway/auth';
import type { ApiResponse } from '../../lib/types';
import type {
  Tenant,
  TenantFullInfo,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateSupabaseConfigRequest,
  TenantConfig,
} from './src/models/tenant';
import type {
  EntityConversionRule,
  CreateEntityConversionRuleRequest,
  UpdateEntityConversionRuleRequest,
  ConversionRuleStats,
} from './src/types/entity-conversion';
import * as TenantService from './service';
import * as EntityConversionRulesService from './src/entity-conversion-rules';
import * as MappingSuggestionsService from './src/mapping-suggestions';

/**
 * Tenant Management API Endpoints
 * RPC endpoints called internally by API Gateway
 * Functional approach - no classes, only pure functions
 */

/**
 * List all tenants (admin only)
 */
export const listTenants = api(
  { auth: true, method: 'GET', path: '/tenants/list' },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<Tenant[]>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getTenantList({
      limit: limit || 50,
      offset: offset || 0,
    });
  }
);

/**
 * Get tenant by ID
 */
export const getTenant = api(
  { auth: true, method: 'GET', path: '/tenants/:tenantId' },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<TenantFullInfo>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getTenantById(tenantId);
  }
);

/**
 * Create new tenant
 */
export const createTenant = api(
  { auth: true, method: 'POST', path: '/tenants/create' },
  async ({ data }: { data: CreateTenantRequest }): Promise<ApiResponse<Tenant>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.createTenant(data);
  }
);

/**
 * Update tenant
 */
export const updateTenant = api(
  { auth: true, method: 'PUT', path: '/tenants/:tenantId' },
  async ({
    tenantId,
    data,
  }: {
    tenantId: string;
    data: UpdateTenantRequest;
  }): Promise<ApiResponse<Tenant>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.updateTenant(tenantId, data);
  }
);

/**
 * Deactivate tenant
 */
export const deactivateTenant = api(
  { auth: true, method: 'DELETE', path: '/tenants/:tenantId' },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.deactivateTenant(tenantId);
  }
);

/**
 * Create Supabase configuration for tenant
 */
export const createSupabaseConfig = api(
  { auth: true, method: 'POST', path: '/tenants/:tenantId/supabase-config' },
  async ({
    tenantId,
    data,
  }: {
    tenantId: string;
    data: CreateSupabaseConfigRequest;
  }): Promise<ApiResponse<TenantConfig>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.createSupabaseConfig(tenantId, data);
  }
);

// ===== EXTENSIBLE FIELDS ENDPOINTS =====

/**
 * Получение определений полей для тенанта и сущности
 * Используется Content Management Service для получения метаданных
 */
export const getFieldDefinitions = api(
  { auth: true, method: 'GET', path: '/extensions' },
  async ({
    entityTable,
  }: {
    entityTable?: Query<string>;
  }): Promise<ApiResponse<any[]>> => {
    const authData = getAuthData() as AuthData;
    console.log('[TenantManagement API] getFieldDefinitions called with:', { entityTable });
    console.log('[TenantManagement API] authData:', { tenantId: authData.tenantId, userRole: authData.userRole });
    console.log('[TenantManagement API] Calling TenantService.getFieldDefinitionsForTenant with:', { tenantId: authData.tenantId, entityTable: entityTable || undefined });
    const result = await TenantService.getFieldDefinitionsForTenant(authData.tenantId, entityTable || undefined);
    console.log('[TenantManagement API] TenantService.getFieldDefinitionsForTenant result:', result);
    return result;
  }
);

/**
 * Получение всех определений полей для тенанта
 */
export const getAllFieldDefinitions = api(
  { auth: true, method: 'GET', path: '/extensions/all' },
  async (): Promise<ApiResponse<Record<string, any[]>>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getAllFieldDefinitionsForTenant(authData.tenantId);
  }
);

/**
 * Создание нового определения поля
 */
export const createFieldDefinition = api(
  { auth: true, method: 'POST', path: '/extensions' },
  async ({
    tenantId,
    fieldDefinition,
  }: {
    tenantId: string;
    fieldDefinition: {
      entity_table: string;
      field_name: string;
      field_type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select' | 'multiselect';
      display_name: string;
      description?: string;
      is_required: boolean;
      is_searchable: boolean;
      is_filterable: boolean;
      is_sortable: boolean;
      is_active: boolean;
      default_value?: any;
      validation_rules?: Record<string, any>;
      ui_config?: Record<string, any>;
      field_options?: string[];
    };
  }): Promise<ApiResponse<any>> => {
    return TenantService.createFieldDefinition(tenantId, fieldDefinition);
  }
);

/**
 * Обновление определения поля
 */
export const updateFieldDefinition = api(
  { auth: true, method: 'PUT', path: '/extensions/:fieldId' },
  async ({
    fieldId,
    updates,
  }: {
    fieldId: number;
    updates: {
      entity_table?: string;
      field_name?: string;
      field_type?: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select' | 'multiselect';
      display_name?: string;
      description?: string;
      is_required?: boolean;
      default_value?: any;
      validation_rules?: Record<string, any>;
      field_options?: string[];
    };
  }): Promise<ApiResponse<any>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.updateFieldDefinition(authData.tenantId, fieldId, updates);
  }
);

/**
 * Удаление определения поля
 */
export const deleteFieldDefinition = api(
  { auth: true, method: 'DELETE', path: '/extensions/:fieldId' },
  async ({ fieldId }: { fieldId: number }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.deleteFieldDefinition(authData.tenantId, fieldId);
  }
);

/**
 * Получение статистики использования extensible fields
 */
export const getExtensibleFieldsStats = api(
  { auth: true, method: 'GET', path: '/extensions/stats' },
  async (): Promise<
    ApiResponse<{
      totalTenants: number;
      totalFields: number;
      fieldsByTenant: Record<string, number>;
      fieldsByEntity: Record<string, number>;
    }>
  > => {
    const authData = getAuthData() as AuthData;
    return TenantService.getExtensibleFieldsStats();
  }
);

/**
 * Получение списка поддерживаемых сущностей
 */
export const getSupportedEntities = api(
  { auth: true, method: 'GET', path: '/extensions/supported-entities' },
  async (): Promise<ApiResponse<string[]>> => {
    return TenantService.getSupportedEntities();
  }
);

/**
 * Get available tables for tenant in public schema
 */
export const getAvailableTables = api(
  { auth: true, method: 'GET', path: '/available-tables' },
  async (): Promise<ApiResponse<string[]>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getAvailableTables(authData.tenantId);
  }
);

// ==========================================
// Entity Conversion Rules API Endpoints
// ==========================================

/**
 * Get conversion rules for tenant
 */
export const getConversionRules = api(
  { auth: true, method: 'GET', path: '/entity-conversion-rules' },
  async ({
    sourceEntity,
    isActive,
  }: {
    sourceEntity?: Query<string>;
    isActive?: Query<boolean>;
  }): Promise<ApiResponse<EntityConversionRule[]>> => {
    const authData = getAuthData() as AuthData;
    const data = await EntityConversionRulesService.getConversionRulesForTenant(
      authData.tenantId,
      sourceEntity,
      isActive
    );
    return {
      data,
      message: 'Правила конвертации получены успешно',
    };
  }
);

/**
 * Get conversion rule by ID
 */
export const getConversionRule = api(
  { auth: true, method: 'GET', path: '/entity-conversion-rules/:ruleId' },
  async ({ ruleId }: { ruleId: string }): Promise<ApiResponse<EntityConversionRule | null>> => {
    const rule = await EntityConversionRulesService.getConversionRuleById(ruleId);
    return {
      data: rule,
      message: rule ? 'Правило конвертации найдено' : 'Правило конвертации не найдено',
    };
  }
);

/**
 * Create new conversion rule
 */
export const createConversionRule = api(
  { auth: true, method: 'POST', path: '/entity-conversion-rules' },
  async ({
    ruleData,
  }: {
    ruleData: CreateEntityConversionRuleRequest;
  }): Promise<ApiResponse<EntityConversionRule>> => {
    const authData = getAuthData() as AuthData;
    // Проверка прав доступа - только администраторы могут создавать правила
    if (authData.userRole !== 'admin' && authData.userRole !== 'super_admin') {
      throw new Error('Access denied: Only administrators can create conversion rules');
    }
    const data = await EntityConversionRulesService.createConversionRule(
      authData.tenantId,
      ruleData,
      authData.userID
    );
    return {
      data,
      message: 'Правило конвертации создано успешно',
    };
  }
);

/**
 * Get entity schema (standard + extensible fields)
 */
export const getEntitySchema = api(
  { auth: true, method: 'GET', path: '/entities/:entityName/schema' },
  async ({
    entityName,
  }: {
    entityName: string;
  }): Promise<ApiResponse<any[]>> => {
    const authData = getAuthData() as AuthData;
    
    return TenantService.getEntitySchema({
      tenantId: authData.tenantId,
      entityName,
    });
  }
);

/**
 * Update conversion rule
 */
export const updateConversionRule = api(
  { auth: true, method: 'PUT', path: '/entity-conversion-rules/:ruleId' },
  async ({
    ruleId,
    ruleData,
  }: {
    ruleId: string;
    ruleData: UpdateEntityConversionRuleRequest;
  }): Promise<ApiResponse<EntityConversionRule | null>> => {
    const rule = await EntityConversionRulesService.updateConversionRule(ruleId, ruleData);
    return {
      data: rule,
      message: rule ? 'Правило конвертации обновлено успешно' : 'Правило конвертации не найдено',
    };
  }
);

/**
 * Delete conversion rule (soft delete - deactivation)
 */
export const deleteConversionRule = api(
  { auth: true, method: 'DELETE', path: '/entity-conversion-rules/:ruleId' },
  async ({
    ruleId,
    hardDelete,
  }: {
    ruleId: string;
    hardDelete?: Query<boolean>;
  }): Promise<ApiResponse<boolean>> => {
    const result = await EntityConversionRulesService.deleteConversionRule(
      ruleId,
      !hardDelete // softDelete = !hardDelete
    );
    return {
      data: result,
      message: result ? 'Правило конвертации удалено успешно' : 'Правило конвертации не найдено',
    };
  }
);

/**
 * Get conversion rules statistics
 */
export const getConversionRulesStats = api(
  { auth: true, method: 'GET', path: '/entity-conversion-rules/stats' },
  async (): Promise<ApiResponse<ConversionRuleStats[]>> => {
    const authData = getAuthData() as AuthData;
    const data = await EntityConversionRulesService.getConversionRulesStats(authData.tenantId);
    return {
      data,
      message: 'Статистика правил конвертации получена успешно',
    };
  }
);

/**
 * Validate trigger conditions
 */
export const validateTriggerConditions = api(
  { auth: true, method: 'POST', path: '/entity-conversion-rules/validate-conditions' },
  async ({
    conditions,
    sourceEntity,
  }: {
    conditions: any;
    sourceEntity: string;
  }): Promise<ApiResponse<{ isValid: boolean; errors: string[] }>> => {
    // TODO: Получить доступные поля для sourceEntity
    const availableFields = ['id', 'name', 'email', 'status', 'created_at']; // Заглушка
    
    const result = EntityConversionRulesService.validateTriggerConditions(
      conditions,
      availableFields
    );
    
    return {
      data: result,
      message: result.isValid ? 'Условия валидны' : 'Условия содержат ошибки',
    };
  }
);

/**
 * Health check endpoint (no auth required)
 * Used for system monitoring and load balancer health checks
 */
/**
 * Generate mapping suggestions between source and target entities
 * Generates smart field mapping suggestions based on schema analysis
 */
export const generateMappingSuggestions = api(
  { auth: true, method: 'POST', path: '/mapping-suggestions' },
  async ({
    tenantId,
    sourceEntity,
    targetEntity,
  }: {
    tenantId: string;
    sourceEntity: string;
    targetEntity: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const suggestions = await MappingSuggestionsService.generateMappingSuggestions(
        tenantId,
        sourceEntity,
        targetEntity
      );
      return {
        data: suggestions,
        message: `Mapping suggestions generated successfully for ${sourceEntity} -> ${targetEntity}`,
      };
    } catch (error) {
      console.error('Error generating mapping suggestions:', error);
      throw error;
    }
  }
);

export const health = api(
  { method: 'GET', path: '/health' },
  async (): Promise<ApiResponse<{ admin_db_connected: boolean; timestamp: string }>> => {
    return TenantService.performHealthCheck();
  }
);
