/**
 * Service Clients
 * Centralized imports for microservice RPC clients
 *
 * This file provides type-safe access to all internal microservices
 * using Encore.ts generated clients
 */

// Import generated RPC clients for internal microservices
// Note: These will be available after encore generates the clients
// For now using dynamic imports to avoid build errors
let userManagementService: any;
let tenantManagementService: any;
let contentManagementService: any;

// Initialize clients asynchronously
async function initializeClients() {
  try {
    // Dynamic import to handle cases where clients aren't generated yet
    const clients = await import('~encore/clients');
    userManagementService = clients.user_management;
    tenantManagementService = clients.tenant_management;
    contentManagementService = clients.content_management;
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
 * Content Management Service Client
 * Wraps the RPC calls with proper error handling
 */
export const contentManagementClient = {
  /**
   * List entities with pagination
   */
  listEntities: async (params: { entity: string; limit?: number; offset?: number }) => {
    if (contentManagementService?.listEntities) {
      return await contentManagementService.listEntities(params);
    }
    throw new Error('Content management service not available');
  },

  /**
   * Get single entity by ID
   */
  getEntity: async (params: { entity: string; id: string }) => {
    if (contentManagementService?.getEntity) {
      return await contentManagementService.getEntity(params);
    }
    throw new Error('Content management service not available');
  },

  /**
   * Create new entity
   */
  createEntity: async (params: { entity: string; data: Record<string, any> }) => {
    if (contentManagementService?.createEntity) {
      return await contentManagementService.createEntity(params);
    }
    throw new Error('Content management service not available');
  },

  /**
   * Update existing entity
   */
  updateEntity: async (params: { entity: string; id: string; data: Record<string, any> }) => {
    if (contentManagementService?.updateEntity) {
      return await contentManagementService.updateEntity(params);
    }
    throw new Error('Content management service not available');
  },

  /**
   * Delete entity by ID
   */
  deleteEntity: async (params: { entity: string; id: string }) => {
    if (contentManagementService?.deleteEntity) {
      return await contentManagementService.deleteEntity(params);
    }
    throw new Error('Content management service not available');
  },

  /**
   * Upsert entity (create or update)
   */
  upsertEntity: async (params: {
    entity: string;
    data: Record<string, any>;
    conflictColumns?: string[];
  }) => {
    if (contentManagementService?.upsertEntity) {
      return await contentManagementService.upsertEntity(params);
    }
    throw new Error('Content management service not available');
  },

  /**
   * Count entities in table
   */
  countEntities: async (params: { entity: string; filter?: string }) => {
    if (contentManagementService?.countEntities) {
      return await contentManagementService.countEntities(params);
    }
    throw new Error('Content management service not available');
  },

  /**
   * Search entities with filter
   */
  searchEntities: async (params: {
    entity: string;
    filter?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }) => {
    if (contentManagementService?.searchEntities) {
      return await contentManagementService.searchEntities(params);
    }
    throw new Error('Content management service not available');
  },

  // Legacy methods for backward compatibility
  getContent: async (params: any) => {
    return await contentManagementClient.getEntity({
      entity: params.entity || 'content',
      id: params.id,
    });
  },
  createContent: async (params: any) => {
    return await contentManagementClient.createEntity({
      entity: params.entity || 'content',
      data: params.data,
    });
  },
  updateContent: async (params: any) => {
    return await contentManagementClient.updateEntity({
      entity: params.entity || 'content',
      id: params.id,
      data: params.data,
    });
  },
  deleteContent: async (params: any) => {
    return await contentManagementClient.deleteEntity({
      entity: params.entity || 'content',
      id: params.id,
    });
  },
  listContent: async (params: any) => {
    return await contentManagementClient.listEntities({
      entity: params.entity || 'content',
      limit: params.limit,
      offset: params.offset,
    });
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
