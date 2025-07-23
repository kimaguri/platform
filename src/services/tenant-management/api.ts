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
import * as TenantService from './service';

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
 * Create new tenant (admin only)
 */
export const createTenant = api(
  { auth: true, method: 'POST', path: '/tenants' },
  async (createData: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.createNewTenant(createData);
  }
);

/**
 * Update existing tenant (admin only)
 */
export const updateTenant = api(
  { auth: true, method: 'PUT', path: '/tenants/:tenantId' },
  async ({
    tenantId,
    ...updateData
  }: UpdateTenantRequest & { tenantId: string }): Promise<ApiResponse<Tenant>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.updateExistingTenant(tenantId, updateData);
  }
);

/**
 * Delete/deactivate tenant (admin only)
 */
export const deleteTenant = api(
  { auth: true, method: 'DELETE', path: '/tenants/:tenantId' },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.deactivateTenant(tenantId);
  }
);

/**
 * Get tenant configuration
 */
export const getTenantConfig = api(
  { auth: true, method: 'GET', path: '/tenants/:tenantId/config' },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<TenantConfig>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getTenantConfiguration(tenantId);
  }
);

/**
 * Create tenant Supabase configuration (admin only)
 */
export const createTenantConfig = api(
  { auth: true, method: 'POST', path: '/tenants/:tenantId/config' },
  async ({
    tenantId,
    ...configData
  }: {
    tenantId: string;
    supabase_project_id: string;
    supabase_url: string;
    supabase_anon_key: string;
    supabase_service_key: string;
    region?: string;
    plan?: 'free' | 'pro' | 'team' | 'enterprise';
  }): Promise<ApiResponse<TenantConfig>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.createTenantConfiguration(tenantId, configData);
  }
);

/**
 * Health check for tenant management system
 */
export const healthCheck = api(
  { auth: false, method: 'GET', path: '/tenants/health' },
  async (): Promise<ApiResponse<{ admin_db_connected: boolean; timestamp: string }>> => {
    return TenantService.performHealthCheck();
  }
);
