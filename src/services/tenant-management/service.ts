import { secret } from 'encore.dev/config'; // Используем Encore secrets
import type { ApiResponse } from '../../lib/types';
import type {
  Tenant,
  TenantFullInfo,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateSupabaseConfigRequest,
  TenantConfig,
} from './src/models/tenant';

// Encore secrets for admin database
const AdminSupabaseUrl = secret('ADMIN_SUPABASE_URL');
const AdminSupabaseServiceKey = secret('ADMIN_SUPABASE_SERVICE_KEY');

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
  getActiveTenants,
  getTenantFullInfo,
  getAllExtensionFields,
} from './src/admin-operations';

import type { ExtensionFieldDefinition as ExtensionFieldDefinitionInternal } from './src/models/extensionField';
import type { EntityFieldDefinition } from './src/extensible-fields'; // Импортируем новый тип
export type { EntityFieldDefinition } from './src/extensible-fields'; // Импортируем и экспортируем новый тип
import {
  SUPPORTED_ENTITIES,
  getFieldDefinitionsForTenant as getExtensionFieldsForTenant,
  getAllFieldDefinitionsForTenant as getAllExtensionFieldsForTenant,
  createFieldDefinition as createExtensionFieldDefinitionInternal,
  getEntitySchema as getEntitySchemaFromModule, // Импортируем новую функцию
} from './src/extensible-fields';

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
    const tenantData = {
      ...data,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const tenant = await createAdminTenant(tenantData);

    if (!tenant) {
      return {
        error: 'Failed to create tenant',
        message: 'Tenant creation failed',
      };
    }

    // Config cache cleared automatically in new architecture

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
    const tenant = await updateAdminTenant(tenantId, data);

    if (!tenant) {
      return {
        error: `Tenant with id ${tenantId} not found`,
        message: 'Tenant not found',
      };
    }

    // Config cache cleared automatically in new architecture

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
    const success = await deleteAdminTenant(tenantId);

    if (!success) {
      return {
        error: `Failed to deactivate tenant ${tenantId}`,
        message: 'Tenant deactivation failed',
      };
    }

    // Config cache cleared automatically in new architecture

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
    const configData = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const config = await createAdminTenantConfig(configData);

    if (!config) {
      return {
        error: 'Failed to create Supabase configuration',
        message: 'Configuration creation failed',
      };
    }

    // Config cache cleared automatically in new architecture

    // Return the config directly as it already matches TenantConfig format

    return {
      data: config,
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
    const config = await getAdminTenantConfigById(tenantId);

    if (!config) {
      return {
        error: `Configuration for tenant ${tenantId} not found`,
        message: 'Configuration not found',
      };
    }

    return {
      data: config,
      message: `Retrieved configuration for tenant ${tenantId}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch configuration',
      message: 'Failed to fetch configuration',
    };
  }
}

/**
 * Get entity schema (standard + custom fields)
 */
export async function getEntitySchema(params: {
  tenantId: string;
  entityName: string;
}): Promise<ApiResponse<EntityFieldDefinition[]>> {
  try {
    const schema = await getEntitySchemaFromModule(params.tenantId, params.entityName);
    return {
      data: schema,
      message: `Schema retrieved for entity ${params.entityName}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch entity schema',
      message: 'Failed to fetch entity schema',
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
): Promise<ApiResponse<ExtensionFieldDefinitionInternal[]>> {
  try {
    let definitions: ExtensionFieldDefinitionInternal[];

    if (entityTable) {
      // Если указана конкретная сущность, получаем поля только для нее.
      definitions = await getExtensionFieldsForTenant(tenantId, entityTable);
    } else {
      // Если сущность не указана, получаем поля для всех сущностей и объединяем в один массив.
      const allDefinitionsMap = await getAllExtensionFieldsForTenant(tenantId);
      definitions = Object.values(allDefinitionsMap).flat();
    }

    return {
      data: definitions,
      message: `Retrieved ${definitions.length} field definitions for tenant ${tenantId}`,
    };
  } catch (error) {
    const errorMessage = `Failed to get field definitions for tenant ${tenantId}`;
    return {
      error: error instanceof Error ? error.message : errorMessage,
      message: errorMessage,
    };
  }
}

/**
 * Get all field definitions for tenant
 */
export async function getAllFieldDefinitionsForTenant(
  tenantId: string
): Promise<ApiResponse<Record<string, ExtensionFieldDefinitionInternal[]>>> {
  try {
    const definitions = await getAllExtensionFieldsForTenant(tenantId);
    return {
      data: definitions,
      message: `Retrieved all field definitions for tenant ${tenantId}`,
    };
  } catch (error) {
    return {
      error: 'Failed to get all field definitions',
      message: `Failed to get all field definitions for tenant ${tenantId}`,
    };
  }
}

/**
 * Create field definition
 */
export async function createFieldDefinition(
  tenantId: string,
  fieldDefinition: Omit<
    ExtensionFieldDefinitionInternal,
    'id' | 'tenant_id' | 'created_at' | 'updated_at'
  >
): Promise<ApiResponse<ExtensionFieldDefinitionInternal>> {
  try {
    if (!SUPPORTED_ENTITIES.includes(fieldDefinition.entity_table as any)) {
      return {
        error: `Entity table '${fieldDefinition.entity_table}' is not supported.`,
        message: 'Unsupported entity table',
      };
    }

    const newField = await createExtensionFieldDefinitionInternal(tenantId, fieldDefinition);
    return {
      data: newField,
      message: 'Field definition created successfully',
    };
  } catch (error) {
    return {
      error: 'Failed to create field definition',
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
  updates: Partial<
    Omit<ExtensionFieldDefinitionInternal, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  >
): Promise<ApiResponse<ExtensionFieldDefinitionInternal>> {
  try {
    // First, get the existing field to verify tenant ownership
    const existingFieldsRecord = await getAllExtensionFieldsForTenant(tenantId);
    const allFields = Object.values(existingFieldsRecord).flat();
    const existingField = allFields.find(
      (field: ExtensionFieldDefinitionInternal) => field.id === fieldId
    );

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
    const existingField = allFields.find(
      (field: ExtensionFieldDefinitionInternal) => field.id === fieldId
    );

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
    const tenants = await getAllTenants();
    const activeTenants = tenants.filter((t: any) => t.status === 'active');
    const inactiveTenants = tenants.filter((t: any) => t.status !== 'active');

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
          Authorization: `Bearer ${tenantConfig.SERVICE_KEY}`,
          apikey: tenantConfig.SERVICE_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const openApiSpec = (await response.json()) as any;
        // Извлекаем имена таблиц из OpenAPI спецификации
        if (openApiSpec && openApiSpec.paths && typeof openApiSpec.paths === 'object') {
          tablesData = Object.keys(openApiSpec.paths)
            .filter((path) => path.startsWith('/') && !path.includes('{') && !path.includes('rpc'))
            .map((path) => path.substring(1)) // убираем первый слэш
            .filter((name) => name && !name.includes('/') && name !== 'rpc') // только простые имена таблиц
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

// ===== SECRET HELPER FUNCTIONS =====
// These functions provide access to Encore secrets from within the service

/**
 * Get admin Supabase URL from Encore secrets
 */
export function getAdminSupabaseUrl() {
  return AdminSupabaseUrl();
}

/**
 * Get admin Supabase service key from Encore secrets
 */
export function getAdminSupabaseServiceKey() {
  return AdminSupabaseServiceKey();
}
