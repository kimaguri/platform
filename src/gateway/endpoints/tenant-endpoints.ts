import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { tenantManagementClient, type ApiResponse } from '../utils/service-clients';

// Request/Response interfaces
interface TenantProfile {
  id: string;
  name: string;
  domain?: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TenantConfig {
  tenantId: string;
  supabaseUrl: string;
  features: string[];
  limits: {
    maxUsers: number;
    maxStorage: number;
  };
  customization: Record<string, any>;
}

interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  settings?: Record<string, any>;
}

/**
 * Tenant Management Endpoints - /api/v1/tenants/*
 */

export const getCurrentTenant = api(
  { method: 'GET', path: '/api/v1/tenants/me', expose: true, auth: true },
  async (): Promise<ApiResponse<TenantProfile>> => {
    const authData = getAuthData() as AuthData;

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.getTenant({
        tenantId: authData.tenantId,
      });

      return {
        data: result,
        message: 'Tenant profile retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get tenant profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const updateCurrentTenant = api(
  { method: 'PUT', path: '/api/v1/tenants/me', expose: true, auth: true },
  async (data: UpdateTenantRequest): Promise<ApiResponse<TenantProfile>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (!authData.permissions?.includes('tenant:write') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to update tenant');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.updateTenant({
        tenantId: authData.tenantId,
        ...data,
      });

      return {
        data: result,
        message: 'Tenant profile updated',
      };
    } catch (error) {
      throw new Error(
        `Failed to update tenant profile: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

export const getTenantConfig = api(
  { method: 'GET', path: '/api/v1/tenants/me/config', expose: true, auth: true },
  async (): Promise<ApiResponse<TenantConfig>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (!authData.permissions?.includes('tenant:read') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to view tenant configuration');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.getTenantConfig({
        tenantId: authData.tenantId,
      });

      return {
        data: result,
        message: 'Tenant configuration retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get tenant configuration: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

export const listTenants = api(
  { method: 'GET', path: '/api/v1/tenants', expose: true, auth: true },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<TenantProfile[]>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has super admin permissions (cross-tenant access)
    if (authData.role !== 'super_admin') {
      throw new Error('Insufficient permissions to list tenants');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.listTenants({
        limit: limit || 50,
        offset: offset || 0,
      });

      return {
        data: (result as any)?.tenants || [],
        message: 'Tenants retrieved',
        meta: {
          total: (result as any)?.total || 0,
          limit: limit || 50,
          page: Math.floor((offset || 0) / (limit || 50)) + 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to list tenants: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const getTenantById = api(
  { method: 'GET', path: '/api/v1/tenants/:id', expose: true, auth: true },
  async ({ id }: { id: string }): Promise<ApiResponse<TenantProfile>> => {
    const authData = getAuthData() as AuthData;

    // Users can only access their own tenant or super admins can access any
    if (authData.tenantId !== id && authData.role !== 'super_admin') {
      throw new Error('Insufficient permissions to view this tenant');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.getTenant({
        tenantId: id,
      });

      return {
        data: result,
        message: 'Tenant retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get tenant: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
