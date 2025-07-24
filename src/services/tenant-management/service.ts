import type { ApiResponse } from '../../lib/types';
import type {
  Tenant,
  TenantFullInfo,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateSupabaseConfigRequest,
  TenantConfig,
} from './src/models/tenant';

// Import new functional repositories
import { createAdminAdapter } from './src/database/adapters/adminAdapter';
import { createTenantRepository, createExtensionFieldRepository } from './src/database/repositories';
import type { ExtensionFieldDefinition } from './src/database/types';
import { SUPPORTED_ENTITIES } from './src/extensible-fields';
import { getTenantFullInfo, checkAdminConnection } from '../../lib/adminDb/client';

// Cache for repositories
let tenantRepo: ReturnType<typeof createTenantRepository> | null = null;
let extensionRepo: ReturnType<typeof createExtensionFieldRepository> | null = null;

/**
 * Initialize repositories with hardcoded credentials
 */
function initializeRepositories() {
  if (!tenantRepo) {
    // Using hardcoded credentials for simplx_crm_tenant
    const adapter = createAdminAdapter();
    tenantRepo = createTenantRepository(adapter);
    extensionRepo = createExtensionFieldRepository(adapter);
  }
  
  return { tenantRepo, extensionRepo };
}

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
  entityTable: string
): Promise<ApiResponse<ExtensionFieldDefinition[]>> {
  try {
    const { extensionRepo } = initializeRepositories();
    if (!extensionRepo) {
      throw new Error('Extension repository not initialized');
    }
    const definitions = await extensionRepo.findByTenantAndEntity(tenantId, entityTable);

    return {
      data: definitions,
      message: `Retrieved ${definitions.length} field definitions for ${tenantId}:${entityTable}`,
    };
  } catch (error) {
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
    const { extensionRepo } = initializeRepositories();
    if (!extensionRepo) {
      throw new Error('Extension repository not initialized');
    }
    const allDefinitions = await extensionRepo.findByTenant(tenantId);
    
    // Group by entity_table
    const definitions: Record<string, ExtensionFieldDefinition[]> = {};
    for (const def of allDefinitions) {
      if (!definitions[def.entity_table]) {
        definitions[def.entity_table] = [];
      }
      definitions[def.entity_table].push(def);
    }

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
  try {
    const { extensionRepo } = initializeRepositories();
    if (!extensionRepo) {
      throw new Error('Extension repository not initialized');
    }
    const definition = await extensionRepo.create({
      ...fieldDefinition,
      tenant_id: tenantId,
    });

    return {
      data: definition,
      message: `Created field definition '${definition.display_name}' for ${tenantId}:${definition.entity_table}`,
    };
  } catch (error) {
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
  fieldId: number,
  updates: Partial<Omit<ExtensionFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<ApiResponse<ExtensionFieldDefinition>> {
  try {
    const { extensionRepo } = initializeRepositories();
    if (!extensionRepo) {
      throw new Error('Extension repository not initialized');
    }
    const definition = await extensionRepo.update(fieldId, updates);

    return {
      data: definition,
      message: `Updated field definition '${definition.display_name}'`,
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
export async function deleteFieldDefinition(fieldId: number): Promise<ApiResponse<boolean>> {
  try {
    const { extensionRepo } = initializeRepositories();
    if (!extensionRepo) {
      throw new Error('Extension repository not initialized');
    }
    await extensionRepo.delete(fieldId);

    return {
      data: true,
      message: `Deleted field definition ${fieldId}`,
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
    const { tenantRepo, extensionRepo } = initializeRepositories();
    if (!tenantRepo || !extensionRepo) {
      throw new Error('Repositories not initialized');
    }
    
    // Get all tenants and extension fields
    const tenants = await tenantRepo.findAll();
    const allFields = await extensionRepo.findAll();
    
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
    const { tenantRepo } = initializeRepositories();
    if (!tenantRepo) {
      throw new Error('Tenant repository not initialized');
    }
    const allTenants = await tenantRepo.findAll();

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
