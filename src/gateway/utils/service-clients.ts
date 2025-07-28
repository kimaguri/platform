/**
 * Service Clients
 * Centralized imports for microservice RPC clients
 *
 * This file provides type-safe access to all internal microservices
 * using Encore.ts generated clients
 */

// Типы для преобразования данных (совпадают с data-processing/api.ts)
type ExtensionFieldValue = Record<string, any>;

type Payload = {
  baseFields: Record<string, any>;
  extensions: ExtensionFieldValue;
};

/**
 * Преобразование простых данных в Payload для data-processing сервиса
 */
function toPayload(data: Record<string, any>): Payload {
  return {
    baseFields: data,
    extensions: {},
  };
}

/**
 * Преобразование Payload обратно в простые данные
 */
function fromPayload(payload: Payload): Record<string, any> {
  return {
    ...payload.baseFields,
    ...payload.extensions,
  };
}

// Import generated RPC clients for internal microservices
// Note: These will be available after encore generates the clients
// For now using dynamic imports to avoid build errors
let userManagementService: any;
let tenantManagementService: any;
let dataProcessingService: any;

// Initialize clients asynchronously
async function initializeClients() {
  try {
    // Dynamic import to handle cases where clients aren't generated yet
    const clients = await import('~encore/clients');
    userManagementService = clients.user_management;
    tenantManagementService = clients.tenant_management;
    dataProcessingService = clients.data_processing;
  } catch (error) {
    console.warn('Encore clients not available yet, using fallback implementations');
  }
}

// Initialize clients on module load
initializeClients();

/**
 * User Management Service Client
 * Wraps the RPC calls with proper error handling
 */
export const userManagementClient = {
  /**
   * List users with pagination
   */
  listUsers: async (params: { limit?: number; offset?: number }) => {
    if (userManagementService?.listUsers) {
      return await userManagementService.listUsers(params);
    }
    throw new Error('User management service not available');
  },

  /**
   * Get user profile by ID
   */
  getUserProfile: async (params: { userId: string }) => {
    if (userManagementService?.getUserProfile) {
      return await userManagementService.getUserProfile(params);
    }
    throw new Error('User management service not available');
  },

  /**
   * Get current user's profile
   */
  getMyProfile: async () => {
    if (userManagementService?.getMyProfile) {
      return await userManagementService.getMyProfile();
    }
    throw new Error('User management service not available');
  },

  /**
   * Update current user's profile
   */
  updateMyProfile: async (updateData: any) => {
    if (userManagementService?.updateMyProfile) {
      return await userManagementService.updateMyProfile(updateData);
    }
    throw new Error('User management service not available');
  },

  /**
   * Update user role (admin only)
   */
  updateUserRole: async (params: { userId: string; role: string; permissions?: string[] }) => {
    if (userManagementService?.updateUserRole) {
      return await userManagementService.updateUserRole(params);
    }
    throw new Error('User management service not available');
  },

  /**
   * Deactivate user (admin only)
   */
  deactivateUser: async (params: { userId: string }) => {
    if (userManagementService?.deactivateUser) {
      return await userManagementService.deactivateUser(params);
    }
    throw new Error('User management service not available');
  },

  /**
   * Authentication - Login user
   */
  login: async (params: { tenantId: string; email: string; password: string }) => {
    if (userManagementService?.login) {
      return await userManagementService.login(params);
    }
    throw new Error('User management service not available');
  },
  /**
   * Authentication - Register user
   */
  register: async (params: {
    tenantId: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  }) => {
    if (userManagementService?.register) {
      return await userManagementService.register(params);
    }
    throw new Error('User management service not available');
  },
  getUser: async (params: any) => {
    console.log('params', params);
    return await userManagementService.getUserProfileById({
      tenantId: params.tenantId,
      userId: params.userID,
    });
  },
  updateUser: async (params: any) => {
    const { userID, ...updateData } = params;
    return await userManagementClient.updateMyProfile(updateData);
  },

  /**
   * Get application bootstrap data
   * Loads all essential data needed for app initialization in one request
   */
  getAppBootstrap: async () => {
    if (userManagementService?.getAppBootstrapData) {
      return await userManagementService.getAppBootstrapData();
    }
    throw new Error('User management service not available');
  },
};

/**
 * Tenant Management Service Client
 * Wraps the RPC calls with proper error handling
 */
export const tenantManagementClient = {
  /**
   * List all tenants (admin only)
   */
  listTenants: async (params: { limit?: number; offset?: number }) => {
    if (tenantManagementService?.listTenants) {
      return await tenantManagementService.listTenants(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Get tenant by ID
   */
  getTenant: async (params: { tenantId: string }) => {
    if (tenantManagementService?.getTenant) {
      return await tenantManagementService.getTenant(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Create new tenant (admin only)
   */
  createTenant: async (createData: any) => {
    if (tenantManagementService?.createTenant) {
      return await tenantManagementService.createTenant(createData);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Update existing tenant (admin only)
   */
  updateTenant: async (params: { tenantId: string; [key: string]: any }) => {
    if (tenantManagementService?.updateTenant) {
      return await tenantManagementService.updateTenant(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Delete/deactivate tenant (admin only)
   */
  deleteTenant: async (params: { tenantId: string }) => {
    if (tenantManagementService?.deleteTenant) {
      return await tenantManagementService.deleteTenant(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Get tenant configuration
   */
  getTenantConfig: async (params: { tenantId: string }) => {
    if (tenantManagementService?.getTenantConfig) {
      return await tenantManagementService.getTenantConfig(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Create tenant Supabase configuration (admin only)
   */
  createTenantConfig: async (params: { tenantId: string; [key: string]: any }) => {
    if (tenantManagementService?.createTenantConfig) {
      return await tenantManagementService.createTenantConfig(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Health check for tenant management system
   */
  healthCheck: async () => {
    if (tenantManagementService?.healthCheck) {
      return await tenantManagementService.healthCheck();
    }
    throw new Error('Tenant management service not available');
  },
};

/**
 * Data Processing Service Client
 * Wraps the RPC calls with proper error handling
 */
export const dataProcessingClient = {
  /**
   * List entities with pagination
   */
  listEntityRecords: async (params: {
    entity: string;
    limit?: number;
    offset?: number;
    select?: string;
    filters?: string;
    sorters?: string;
    meta?: string;
  }) => {
    if (dataProcessingService?.getEntityList) {
      return await dataProcessingService.getEntityList({
        entityTable: params.entity,
        limit: params.limit,
        offset: params.offset,
        select: params.select,
        filters: params.filters,
        sorters: params.sorters,
        meta: params.meta,
      });
    }
    throw new Error('Content management service not available');
  },

  /**
   * Get single entity by ID
   */
  getEntityRecord: async (params: { entity: string; id: string }) => {
    if (dataProcessingService?.getEntityRecordData) {
      return await dataProcessingService.getEntityRecordData({
        entityTable: params.entity,
        recordId: params.id,
      });
    }
    throw new Error('Data processing service not available');
  },

  /**
   * Create new entity
   * Принимает { entity, data: Payload } и передает в data-processing
   */
  createEntityRecord: async (params: { entity: string; data: Payload }) => {
    if (dataProcessingService?.createEntityRecord) {
      // Передаем Payload напрямую в data-processing сервис
      const transformedParams = {
        entityTable: params.entity,
        entityData: params.data, // Прямая передача Payload
        extensionFieldsData: params.data.extensions, // Используем extensions из Payload
      };
      return await dataProcessingService.createEntityRecord(transformedParams);
    }
    throw new Error('Data processing service not available');
  },

  /**
   * Update existing entity
   * Принимает { entity, id, data: Payload } и передает в data-processing
   */
  updateEntityRecord: async (params: { entity: string; id: string; data: Payload }) => {
    if (dataProcessingService?.updateEntityRecord) {
      // Передаем Payload напрямую в data-processing сервис
      const transformedParams = {
        entityTable: params.entity,
        recordId: params.id,
        entityData: params.data, // Прямая передача Payload
        extensionFieldsData: params.data.extensions, // Используем extensions из Payload
      };
      return await dataProcessingService.updateEntityRecord(transformedParams);
    }
    throw new Error('Data processing service not available');
  },

  /**
   * Delete entity by ID
   */
  deleteEntityRecord: async (params: { entity: string; id: string }) => {
    if (dataProcessingService?.deleteEntityRecord) {
      return await dataProcessingService.deleteEntityRecord(params);
    }
    throw new Error('Data processing service not available');
  },

  /**
   * Upsert entity (create or update)
   */
  upsertEntityRecord: async (params: {
    entity: string;
    data: Record<string, any>;
    conflictColumns?: string[];
  }) => {
    if (dataProcessingService?.upsertEntityRecord) {
      return await dataProcessingService.upsertEntityRecord(params);
    }
    throw new Error('Data processing service not available');
  },

  /**
   * Count entities in table
   */
  countEntityRecords: async (params: { entity: string; filter?: string }) => {
    if (dataProcessingService?.countEntityRecords) {
      return await dataProcessingService.countEntityRecords(params);
    }
    throw new Error('Data processing service not available');
  },

  /**
   * Search entities with filter
   */
  searchEntityRecords: async (params: {
    entity: string;
    filter?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }) => {
    if (dataProcessingService?.searchEntityRecords) {
      return await dataProcessingService.searchEntityRecords(params);
    }
    throw new Error('Data processing service not available');
  },
};

/**
 * Unified error response format
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  code: number;
  details?: any;
}

/**
 * Unified success response format
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
