import { api } from 'encore.dev/api';
import {
  getActiveTenants,
  getTenantFullInfo,
  createTenant,
  updateTenant,
  deactivateTenant,
  checkAdminConnection,
} from '../../../../shared/adminDb/client';
import {
  Tenant,
  TenantFullInfo,
  CreateTenantRequest,
  UpdateTenantRequest,
} from '../../../../shared/adminDb/types';
import { clearConfigCache } from '../../../../shared/tenantConfig';
import { ApiResponse } from '../../../../shared/types';

// ===== ПОЛУЧЕНИЕ ТЕНАНТОВ =====

export const listTenants = api(
  { method: 'GET', path: '/tenants', expose: true },
  async (): Promise<ApiResponse<Tenant[]>> => {
    try {
      const tenants = await getActiveTenants();
      return {
        data: tenants,
        message: `Retrieved ${tenants.length} active tenants`,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch tenants',
        message: 'Failed to fetch tenants',
      };
    }
  }
);

interface GetTenantRequest {
  tenantId: string;
}

export const getTenant = api(
  { method: 'GET', path: '/tenants/:tenantId', expose: true },
  async ({ tenantId }: GetTenantRequest): Promise<ApiResponse<TenantFullInfo>> => {
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
);

// ===== СОЗДАНИЕ ТЕНАНТОВ =====

export const createNewTenant = api(
  { method: 'POST', path: '/tenants', expose: true },
  async (request: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
    try {
      const tenant = await createTenant(request);

      if (!tenant) {
        return {
          error: 'Failed to create tenant',
          message: 'Tenant creation failed',
        };
      }

      // Очищаем кэш после создания
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
);

// ===== ОБНОВЛЕНИЕ ТЕНАНТОВ =====

interface UpdateTenantApiRequest extends UpdateTenantRequest {
  tenantId: string;
}

export const updateExistingTenant = api(
  { method: 'PUT', path: '/tenants/:tenantId', expose: true },
  async ({ tenantId, ...updates }: UpdateTenantApiRequest): Promise<ApiResponse<Tenant>> => {
    try {
      const tenant = await updateTenant(tenantId, updates);

      if (!tenant) {
        return {
          error: 'Failed to update tenant',
          message: 'Tenant update failed',
        };
      }

      // Очищаем кэш после обновления
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
);

// ===== ДЕАКТИВАЦИЯ ТЕНАНТОВ =====

interface DeactivateTenantRequest {
  tenantId: string;
}

export const deactivateExistingTenant = api(
  { method: 'DELETE', path: '/tenants/:tenantId', expose: true },
  async ({ tenantId }: DeactivateTenantRequest): Promise<ApiResponse<boolean>> => {
    try {
      const success = await deactivateTenant(tenantId);

      if (!success) {
        return {
          error: 'Failed to deactivate tenant',
          message: 'Tenant deactivation failed',
        };
      }

      // Очищаем кэш после деактивации
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
);

// ===== СТАТУС СИСТЕМЫ =====

export const healthCheck = api(
  { method: 'GET', path: '/tenants/health', expose: true },
  async (): Promise<ApiResponse<{ admin_db_connected: boolean; timestamp: string }>> => {
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
);
