import type { ApiResponse } from '../../lib/types';
import type {
  Tenant,
  TenantFullInfo,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateSupabaseConfigRequest,
  TenantConfig,
} from './src/models/tenant';

// Import admin DB functions for tenant operations
import {
  getActiveTenants,
  getTenantFullInfo,
  createTenant as createTenantInDb,
  updateTenant as updateTenantInDb,
  deactivateTenant as deactivateTenantInDb,
  createSupabaseConfig,
  checkAdminConnection,
} from '../../lib/adminDb/client';
import { clearConfigCache } from '../../lib/config/tenantConfig';

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
 * Get tenant by ID with full information
 */
export async function getTenantById(tenantId: string): Promise<ApiResponse<TenantFullInfo>> {
  try {
    const tenant = await getTenantFullInfo(tenantId);

    if (!tenant) {
      return {
        error: 'Tenant not found',
        message: 'Tenant not found',
      };
    }

    return {
      data: tenant,
      message: 'Tenant retrieved successfully',
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
export async function createNewTenant(
  createData: CreateTenantRequest
): Promise<ApiResponse<Tenant>> {
  try {
    const tenant = await createTenantInDb(createData);

    if (!tenant) {
      return {
        error: 'Failed to create tenant',
        message: 'Tenant creation failed',
      };
    }

    // Clear config cache after creation
    clearConfigCache();

    return {
      data: tenant,
      message: 'Tenant created successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create tenant',
      message: 'Tenant creation failed',
    };
  }
}

/**
 * Update existing tenant
 */
export async function updateExistingTenant(
  tenantId: string,
  updateData: UpdateTenantRequest
): Promise<ApiResponse<Tenant>> {
  try {
    const tenant = await updateTenantInDb(tenantId, updateData);

    if (!tenant) {
      return {
        error: 'Failed to update tenant',
        message: 'Tenant update failed',
      };
    }

    // Clear config cache after update
    clearConfigCache();

    return {
      data: tenant,
      message: 'Tenant updated successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update tenant',
      message: 'Tenant update failed',
    };
  }
}

/**
 * Deactivate tenant (soft delete)
 */
export async function deactivateTenant(tenantId: string): Promise<ApiResponse<boolean>> {
  try {
    const success = await deactivateTenantInDb(tenantId);

    if (!success) {
      return {
        error: 'Failed to deactivate tenant',
        message: 'Tenant deactivation failed',
      };
    }

    // Clear config cache after deactivation
    clearConfigCache();

    return {
      data: true,
      message: 'Tenant deactivated successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to deactivate tenant',
      message: 'Tenant deactivation failed',
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

/**
 * Create tenant Supabase configuration
 */
export async function createTenantConfiguration(
  tenantId: string,
  configData: {
    supabase_project_id: string;
    supabase_url: string;
    supabase_anon_key: string;
    supabase_service_key: string;
    region?: string;
    plan?: 'free' | 'pro' | 'team' | 'enterprise';
  }
): Promise<ApiResponse<TenantConfig>> {
  try {
    const config = await createSupabaseConfig({
      tenant_id: tenantId,
      supabase_project_id: configData.supabase_project_id,
      supabase_url: configData.supabase_url,
      anon_key: configData.supabase_anon_key,
      service_key: configData.supabase_service_key,
      region: configData.region,
      plan: configData.plan,
    });

    if (!config) {
      return {
        error: 'Failed to create Supabase configuration',
        message: 'Configuration creation failed',
      };
    }

    // Clear config cache after creation
    clearConfigCache();

    // Convert TenantSupabaseConfig to TenantConfig
    const tenantConfig: TenantConfig = {
      id: config.id,
      tenant_id: config.tenant_id,
      supabase_url: config.supabase_url,
      supabase_anon_key: config.anon_key,
      supabase_service_key: config.service_key,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };

    return {
      data: tenantConfig,
      message: 'Supabase configuration created successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create configuration',
      message: 'Configuration creation failed',
    };
  }
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
    const tenants = await getActiveTenants();
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
    const allTenants = await getActiveTenants();

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
