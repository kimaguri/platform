import type { ApiResponse } from '../../lib/types';
import type {
  Tenant,
  TenantFullInfo,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateSupabaseConfigRequest,
  TenantConfig,
} from './src/models/tenant';

// Import admin operations - functional approach following other services
import {
  getAllTenants,
  getTenantById as getAdminTenantById,
  createTenant as createAdminTenant,
  updateTenant as updateAdminTenant,
  deleteTenant as deleteAdminTenant,
  getAllTenantConfigs,
  getTenantConfigById as getAdminTenantConfigById,
  createTenantConfig as createAdminTenantConfig,
  updateTenantConfig as updateAdminTenantConfig,
  createExtensionField as createAdminExtensionField,
  updateExtensionField as updateAdminExtensionField,
  deleteExtensionField as deleteAdminExtensionField,
  checkAdminConnection,
  countAdminResources,
} from './src/admin-operations';

import type { ExtensionFieldDefinition } from './src/models/extensionField';
import {
  SUPPORTED_ENTITIES,
  getFieldDefinitionsForTenant as getExtensionFieldsForTenant,
  getAllFieldDefinitionsForTenant as getAllExtensionFieldsForTenant,
  createFieldDefinition as createExtensionFieldDefinition,
} from './src/extensible-fields';
import { getTenantFullInfo } from '../../lib/adminDb/client';

/**
 * Tenant Management Business Logic
 * Functional approach using admin Supabase for tenant operations
 * No classes - pure functions only
 */

/**
 * Get tenant list with pagination
 */
export async function getTenantList(params: {
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Tenant[]>> {
  try {
    const { limit = 50, offset = 0 } = params;

    // For now, use existing admin DB function
    // TODO: Implement pagination when admin DB supports it
    const tenants = await getActiveTenants();

    // Apply pagination manually for now
    const paginatedTenants = tenants.slice(offset, offset + limit);

    return {
      data: paginatedTenants,
      message: `Retrieved ${paginatedTenants.length} tenants`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch tenants',
      message: 'Failed to fetch tenants',
    };
  }
}

/**
 * Get single tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<ApiResponse<TenantFullInfo>> {
  try {
    const tenant = await getTenantFullInfo(tenantId);

    if (!tenant) {
      return {
        error: `Tenant with id ${tenantId} not found`,
        message: 'Tenant not found',
      };
    }

    return {
      data: tenant,
      message: `Retrieved tenant ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch tenant',
      message: 'Failed to fetch tenant',
    };
  }
}

/**
 * Create new tenant
 */
export async function createTenant(data: CreateTenantRequest): Promise<ApiResponse<Tenant>> {
  try {
    const tenant = await createTenantInDb(data);

    if (!tenant) {
      return {
        error: 'Failed to create tenant',
        message: 'Tenant creation failed',
      };
    }

    // Clear config cache to ensure fresh data
    clearConfigCache();

    return {
      data: tenant,
      message: `Created tenant ${tenant.name}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create tenant',
      message: 'Failed to create tenant',
    };
  }
}

/**
 * Update existing tenant
 */
export async function updateTenant(
  tenantId: string,
  data: UpdateTenantRequest
): Promise<ApiResponse<Tenant>> {
  try {
    const tenant = await updateTenantInDb(tenantId, data);

    if (!tenant) {
      return {
        error: `Tenant with id ${tenantId} not found`,
        message: 'Tenant not found',
      };
    }

    // Clear config cache to ensure fresh data
    clearConfigCache();

    return {
      data: tenant,
      message: `Updated tenant ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update tenant',
      message: 'Failed to update tenant',
    };
  }
}

/**
 * Deactivate tenant
 */
export async function deactivateTenant(tenantId: string): Promise<ApiResponse<boolean>> {
  try {
    const success = await deactivateTenantInDb(tenantId);

    if (!success) {
      return {
        error: `Failed to deactivate tenant ${tenantId}`,
        message: 'Tenant deactivation failed',
      };
    }

    // Clear config cache to ensure fresh data
    clearConfigCache();

    return {
      data: success,
      message: `Deactivated tenant ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to deactivate tenant',
      message: 'Failed to deactivate tenant',
    };
  }
}

/**
 * Create Supabase configuration for tenant
 */
export async function createSupabaseConfig(
  tenantId: string,
  data: CreateSupabaseConfigRequest
): Promise<ApiResponse<TenantConfig>> {
  try {
    const config = await createSupabaseConfigInDb(data);

    if (!config) {
      return {
        error: 'Failed to create Supabase configuration',
        message: 'Configuration creation failed',
      };
    }

    // Clear config cache to ensure fresh data
    clearConfigCache();

    // Convert to TenantConfig format
    const tenantConfig: TenantConfig = {
      SUPABASE_URL: config.supabase_url,
      ANON_KEY: config.anon_key,
      SERVICE_KEY: config.service_key,
    };

    return {
      data: tenantConfig,
      message: `Created Supabase configuration for tenant ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create Supabase configuration',
      message: 'Failed to create Supabase configuration',
    };
  }
}

/**
 * Get tenant configuration (placeholder for now)
 * TODO: Implement proper config retrieval through ResourceResolver
 */
export async function getTenantConfiguration(tenantId: string): Promise<ApiResponse<TenantConfig>> {
  try {
    // For now, get full tenant info which includes config
    const tenantInfo = await getTenantFullInfo(tenantId);

    if (!tenantInfo || !tenantInfo.supabase_url) {
      return {
        error: 'Tenant configuration not found',
        message: 'Tenant configuration not found',
      };
    }

    // Convert to TenantConfig format
    const config: TenantConfig = {
      id: tenantInfo.id,
      tenant_id: tenantInfo.tenant_id,
      supabase_url: tenantInfo.supabase_url,
      supabase_anon_key: '', // Not available in TenantFullInfo
      supabase_service_key: '', // Not available in TenantFullInfo
      created_at: tenantInfo.created_at,
      updated_at: tenantInfo.updated_at,
    };

    return {
      data: config,
      message: 'Tenant configuration retrieved successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch tenant configuration',
      message: 'Failed to fetch tenant configuration',
    };
  }
}

// ===== EXTENSIBLE FIELDS FUNCTIONS =====

/**
 * Get field definitions for tenant and entity
 */
export async function getFieldDefinitionsForTenant(
  tenantId: string,
  entityTable?: string
): Promise<ApiResponse<ExtensionFieldDefinition[]>> {
  try {
    console.log('[TenantService] getFieldDefinitionsForTenant called:', { tenantId, entityTable });

    // Если entityTable не указан, получаем все поля для тенанта
    if (!entityTable) {
      console.log('[TenantService] No entityTable provided, getting all fields for tenant');
      const allDefinitions = await getAllExtensionFieldsForTenant(tenantId);
      
      // Преобразуем Record<string, ExtensionFieldDefinition[]> в плоский массив
      const flatDefinitions: ExtensionFieldDefinition[] = [];
      Object.values(allDefinitions).forEach(entityFields => {
        flatDefinitions.push(...entityFields);
      });
      
      return {
        data: flatDefinitions,
        message: `Retrieved ${flatDefinitions.length} field definitions for tenant ${tenantId} (all entities)`,
      };
    }

    const definitions = await getExtensionFieldsForTenant(tenantId, entityTable);
    console.log('[TenantService] Got definitions:', definitions.length, 'items');

    return {
      data: definitions,
      message: `Retrieved ${definitions.length} field definitions for ${tenantId}:${entityTable}`,
    };
  } catch (error) {
    console.error('[TenantService] Error in getFieldDefinitionsForTenant:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch field definitions',
      message: 'Failed to fetch field definitions',
    };
  }
}

/**
 * Get all field definitions for tenant
 */
export async function getAllFieldDefinitionsForTenant(
  tenantId: string
): Promise<ApiResponse<Record<string, ExtensionFieldDefinition[]>>> {
  try {
    const definitions = await getAllExtensionFieldsForTenant(tenantId);

    const totalFields = Object.values(definitions).reduce((sum, fields) => sum + fields.length, 0);

    return {
      data: definitions,
      message: `Retrieved ${totalFields} field definitions across ${
        Object.keys(definitions).length
      } entities for tenant ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch field definitions',
      message: 'Failed to fetch field definitions',
    };
  }
}

/**
 * Create field definition
 */
export async function createFieldDefinition(
  tenantId: string,
  fieldDefinition: Omit<ExtensionFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<ExtensionFieldDefinition>> {
  console.log('[TenantService] createFieldDefinition called with:', {
    tenantId,
    fieldDefinition: {
      entity_table: fieldDefinition.entity_table,
      field_name: fieldDefinition.field_name,
      field_type: fieldDefinition.field_type,
      display_name: fieldDefinition.display_name,
      is_required: fieldDefinition.is_required,
      is_active: fieldDefinition.is_active
    }
  });

  try {
    const now = new Date().toISOString();
    console.log('[TenantService] Calling createAdminExtensionField...');
    
    const definition = await createExtensionFieldDefinition(tenantId, fieldDefinition);

    console.log('[TenantService] createAdminExtensionField success:', {
      id: definition.id,
      field_name: definition.field_name,
      display_name: definition.display_name
    });

    return {
      data: definition,
      message: `Created field definition '${definition.display_name}' for ${tenantId}:${definition.entity_table}`,
    };
  } catch (error) {
    console.error('[TenantService] createFieldDefinition error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      tenantId,
      fieldDefinition
    });
    
    return {
      error: error instanceof Error ? error.message : 'Failed to create field definition',
      message: 'Failed to create field definition',
    };
  }
}

/**
 * Update field definition
 */
export async function updateFieldDefinition(
  tenantId: string,
  fieldId: number,
  updates: Partial<Omit<ExtensionFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<ApiResponse<ExtensionFieldDefinition>> {
  try {
    // First, get the existing field to verify tenant ownership
    const existingFieldsRecord = await getAllExtensionFieldsForTenant(tenantId);
    const allFields = Object.values(existingFieldsRecord).flat();
    const existingField = allFields.find((field: ExtensionFieldDefinition) => field.id === fieldId);

    if (!existingField) {
      throw new Error('Field definition not found or access denied');
    }

    const definition = await updateAdminExtensionField(fieldId, updates);
    if (!definition) {
      throw new Error('Field definition not found');
    }

    return {
      data: definition,
      message: `Updated field definition '${definition.display_name}' for ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update field definition',
      message: 'Failed to update field definition',
    };
  }
}

/**
 * Delete field definition
 */
export async function deleteFieldDefinition(
  tenantId: string,
  fieldId: number
): Promise<ApiResponse<boolean>> {
  try {
    // First, get the existing field to verify tenant ownership
    const existingFieldsRecord = await getAllExtensionFieldsForTenant(tenantId);
    const allFields = Object.values(existingFieldsRecord).flat();
    const existingField = allFields.find((field: ExtensionFieldDefinition) => field.id === fieldId);

    if (!existingField) {
      throw new Error('Field definition not found or access denied');
    }

    const success = await deleteAdminExtensionField(fieldId);
    if (!success) {
      throw new Error('Field definition not found');
    }

    return {
      data: true,
      message: `Deleted field definition ${fieldId} for ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete field definition',
      message: 'Failed to delete field definition',
    };
  }
}

/**
 * Get extensible fields statistics
 */
export async function getExtensibleFieldsStats(): Promise<
  ApiResponse<{
    totalTenants: number;
    totalFields: number;
    fieldsByTenant: Record<string, number>;
    fieldsByEntity: Record<string, number>;
  }>
> {
  try {
    // Get all tenants and extension fields using admin operations
    const tenants = await getAllTenants();
    const allFields = await getAllExtensionFields();

    // Calculate stats
    const fieldsByTenant: Record<string, number> = {};
    const fieldsByEntity: Record<string, number> = {};

    for (const field of allFields) {
      // Count by tenant
      fieldsByTenant[field.tenant_id] = (fieldsByTenant[field.tenant_id] || 0) + 1;
      // Count by entity
      fieldsByEntity[field.entity_table] = (fieldsByEntity[field.entity_table] || 0) + 1;
    }

    const stats = {
      totalTenants: tenants.length,
      totalFields: allFields.length,
      fieldsByTenant,
      fieldsByEntity,
    };

    return {
      data: stats,
      message: `Retrieved extensible fields statistics: ${stats.totalFields} fields across ${stats.totalTenants} tenants`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to fetch extensible fields statistics',
      message: 'Failed to fetch extensible fields statistics',
    };
  }
}

/**
 * Get supported entities for extensible fields
 */
export function getSupportedEntities(): ApiResponse<string[]> {
  return {
    data: [...SUPPORTED_ENTITIES],
    message: `${SUPPORTED_ENTITIES.length} entities support extensible fields`,
  };
}

/**
 * Perform health check on admin database connection
 */
export async function performHealthCheck(): Promise<
  ApiResponse<{ admin_db_connected: boolean; timestamp: string }>
> {
  try {
    const isConnected = await checkAdminConnection();

    return {
      data: {
        admin_db_connected: isConnected,
        timestamp: new Date().toISOString(),
      },
      message: isConnected ? 'System healthy' : 'Database connection issues',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Health check failed',
      message: 'Health check failed',
    };
  }
}

/**
 * Get tenant statistics
 */
export async function getTenantStats(): Promise<
  ApiResponse<{
    total: number;
    active: number;
    inactive: number;
  }>
> {
  try {
    const { tenantRepo } = initializeRepositories();
    if (!tenantRepo) {
      throw new Error('Tenant repository not initialized');
    }
    const tenants = await tenantRepo.findAll();
    const activeTenants = tenants.filter((t) => t.status === 'active');
    const inactiveTenants = tenants.filter((t) => t.status !== 'active');

    return {
      data: {
        total: tenants.length,
        active: activeTenants.length,
        inactive: inactiveTenants.length,
      },
      message: 'Tenant statistics retrieved successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch tenant statistics',
      message: 'Failed to fetch tenant statistics',
    };
  }
}

/**
 * Search tenants by name or slug
 */
export async function searchTenants(
  query: string,
  limit: number = 20
): Promise<ApiResponse<Tenant[]>> {
  try {
    // Get all tenants and filter manually for now
    // TODO: Implement proper search through ResourceResolver when available
    const allTenants = await getAllTenants();

    const filteredTenants = allTenants
      .filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(query.toLowerCase()) ||
          tenant.slug.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);

    return {
      data: filteredTenants,
      message: 'Tenants found successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to search tenants',
      message: 'Failed to search tenants',
    };
  }
}

/**
 * Get available tables for tenant in public schema using Supabase REST API with secret key
 */
export async function getAvailableTables(tenantId: string): Promise<ApiResponse<string[]>> {
  try {
    const { getTenantConfigById } = await import('../../lib/config/tenantConfig');
    const tenantConfig = await getTenantConfigById(tenantId);

    if (!tenantConfig) {
      throw new Error(`Tenant configuration not found for tenant: ${tenantId}`);
    }

    // Создаём Supabase клиент с secret key (sb_secret_... или service_role JWT)
    // Secret key обходит RLS и предоставляет полный доступ к базе данных
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseClient = createClient(
      tenantConfig.SUPABASE_URL,
      tenantConfig.SERVICE_KEY || 'sb_publishable_G5EQN05zyYiPceHplDhoHg_QeH6kdIW' // Используем secret key для обхода RLS
    );

    // Используем прямой HTTP запрос к Supabase REST API для получения метаданных
    // Secret key в заголовке Authorization позволяет обойти RLS
    let tablesData: string[] = [];
    let tablesError: any = null;
    
    try {
      const response = await fetch(`${tenantConfig.SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tenantConfig.SERVICE_KEY}`,
          'apikey': tenantConfig.SERVICE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const openApiSpec = await response.json() as any;
        // Извлекаем имена таблиц из OpenAPI спецификации
        if (openApiSpec && openApiSpec.paths && typeof openApiSpec.paths === 'object') {
          tablesData = Object.keys(openApiSpec.paths)
            .filter(path => path.startsWith('/') && !path.includes('{') && !path.includes('rpc'))
            .map(path => path.substring(1)) // убираем первый слэш
            .filter(name => name && !name.includes('/') && name !== 'rpc') // только простые имена таблиц
            .sort();
          

        }
      } else {
        tablesError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      tablesError = error;
    }

    if (tablesError) {
      // Используем статический список как fallback

      const knownTables = [
        'users',
        'roles',
        'permissions',
        'dictionary',
        'dictionary_value',
        'employee',
        'position',
        'organization',
        'work_calendar',
        'work_months',
        'lead_step',
        'resource',
        'role_resource_permissions',
        'p_categories',
        'p_sub_categories',
        'p_nomenclatures',
        'p_measurement_units',
      ];

      return {
        data: knownTables,
        message: 'Available tables retrieved successfully (static list)',
      };
    }

    // Извлекаем имена таблиц из результата
    // tablesData уже содержит массив строк с именами таблиц
    const tableNames = Array.isArray(tablesData) ? tablesData : [];



    return {
      data: tableNames,
      message: `Available tables retrieved successfully (${tableNames.length} tables found)`,
    };
  } catch (error) {
    console.error('[getAvailableTables] Error:', error);

    return {
      data: [],
      message: `Available tables not retrieved. Error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}
