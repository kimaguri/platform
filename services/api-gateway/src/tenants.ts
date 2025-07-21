import { api, Header, Query } from 'encore.dev/api';
import {
  getActiveTenants,
  getTenantFullInfo,
  createTenant,
  createSupabaseConfig,
  updateTenant,
  deactivateTenant,
  checkAdminConnection,
} from '../../../src/shared/adminDb/client';
import {
  CreateTenantRequest,
  CreateSupabaseConfigRequest,
  UpdateTenantRequest,
  TenantFullInfo,
  Tenant,
} from '../../../src/shared/adminDb/types';
import { ApiResponse } from '../../../src/shared/types';
import { clearConfigCache } from '../../../src/shared/tenantConfig';

// ===== ПОЛУЧЕНИЕ ТЕНАНТОВ =====

interface ListTenantsResponse extends ApiResponse {
  data?: Tenant[];
}

export const listTenants = api(
  { method: 'GET', path: '/admin/tenants', expose: true },
  async (): Promise<ListTenantsResponse> => {
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

interface GetTenantResponse extends ApiResponse {
  data?: TenantFullInfo;
}

export const getTenant = api(
  { method: 'GET', path: '/admin/tenants/:tenantId', expose: true },
  async ({ tenantId }: GetTenantRequest): Promise<GetTenantResponse> => {
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

interface CreateTenantApiRequest extends CreateTenantRequest {
  // Дополнительные поля если нужны
}

interface CreateTenantResponse extends ApiResponse {
  data?: Tenant;
}

export const createNewTenant = api(
  { method: 'POST', path: '/admin/tenants', expose: true },
  async (request: CreateTenantApiRequest): Promise<CreateTenantResponse> => {
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

// ===== КОНФИГУРАЦИЯ SUPABASE =====

interface CreateConfigApiRequest extends CreateSupabaseConfigRequest {
  // Дополнительные поля если нужны
}

interface CreateConfigResponse extends ApiResponse {
  data?: any;
}

export const createTenantConfig = api(
  { method: 'POST', path: '/admin/tenants/:tenantId/config', expose: true },
  async ({
    tenantId,
    ...configData
  }: CreateConfigApiRequest & { tenantId: string }): Promise<CreateConfigResponse> => {
    try {
      const config = await createSupabaseConfig({
        ...configData,
        tenant_id: tenantId,
      });

      if (!config) {
        return {
          error: 'Failed to create Supabase configuration',
          message: 'Configuration creation failed',
        };
      }

      // Очищаем кэш после создания конфигурации
      clearConfigCache();

      return {
        data: config,
        message: 'Supabase configuration created successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to create configuration',
        message: 'Configuration creation failed',
      };
    }
  }
);

// ===== ОБНОВЛЕНИЕ ТЕНАНТОВ =====

interface UpdateTenantApiRequest extends UpdateTenantRequest {
  tenantId: string;
}

interface UpdateTenantResponse extends ApiResponse {
  data?: Tenant;
}

export const updateExistingTenant = api(
  { method: 'PUT', path: '/admin/tenants/:tenantId', expose: true },
  async ({ tenantId, ...updates }: UpdateTenantApiRequest): Promise<UpdateTenantResponse> => {
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

interface DeactivateTenantResponse extends ApiResponse {
  data?: {
    deactivated: boolean;
  };
}

export const deactivateExistingTenant = api(
  { method: 'DELETE', path: '/admin/tenants/:tenantId', expose: true },
  async ({ tenantId }: DeactivateTenantRequest): Promise<DeactivateTenantResponse> => {
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
        data: {
          deactivated: true,
        },
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

interface HealthCheckResponse extends ApiResponse {
  data?: {
    admin_db_connected: boolean;
    timestamp: string;
  };
}

export const healthCheck = api(
  { method: 'GET', path: '/admin/health', expose: true },
  async (): Promise<HealthCheckResponse> => {
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
