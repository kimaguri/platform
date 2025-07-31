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
let eventManagementService: any;

// Initialize clients asynchronously
async function initializeClients() {
  try {
    // Dynamic import to handle cases where clients aren't generated yet
    const clients = await import('~encore/clients');
    userManagementService = clients.user_management;
    tenantManagementService = clients.tenant_management;
    dataProcessingService = clients.data_processing;
    eventManagementService = clients.event_management;
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

  /**
   * Authentication - Refresh token
   */
  refreshToken: async (params: {
    tenantId: string;
    refreshToken: string;
  }) => {
    if (userManagementService?.refreshToken) {
      return await userManagementService.refreshToken(params);
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
    if (tenantManagementService?.health) {
      return await tenantManagementService.health();
    }
    throw new Error('Tenant management service not available');
  },

  // ===== EXTENSION TABLE DEFINITIONS METHODS =====

  /**
   * Get field definitions for tenant and entity
   */
  getFieldDefinitions: async (params: { entityTable?: string }): Promise<any> => {
    console.log('[ServiceClient] getFieldDefinitions called with params:', params);
    if (tenantManagementService?.getFieldDefinitions) {
      console.log('[ServiceClient] Calling tenantManagementService.getFieldDefinitions with:', params);
      const result = await tenantManagementService.getFieldDefinitions(params);
      console.log('[ServiceClient] tenantManagementService.getFieldDefinitions result:', result);
      // Возвращаем весь ApiResponse, а не только data
      return result;
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Get all field definitions for tenant
   */
  getAllFieldDefinitions: async (): Promise<Record<string, any[]>> => {
    if (tenantManagementService?.getAllFieldDefinitions) {
      return await tenantManagementService.getAllFieldDefinitions();
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Create new field definition
   */
  createFieldDefinition: async (
    tenantId: string,
    fieldDefinition: any
  ): Promise<any> => {
    if (tenantManagementService?.createFieldDefinition) {
      return await tenantManagementService.createFieldDefinition({ tenantId, fieldDefinition });
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Update existing field definition
   */
  updateFieldDefinition: async (params: {
    fieldId: number;
    updates: any;
  }): Promise<any> => {
    if (tenantManagementService?.updateFieldDefinition) {
      return await tenantManagementService.updateFieldDefinition(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Delete field definition
   */
  deleteFieldDefinition: async (params: { fieldId: number }): Promise<boolean> => {
    if (tenantManagementService?.deleteFieldDefinition) {
      return await tenantManagementService.deleteFieldDefinition(params);
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Get extensible fields statistics
   */
  getExtensibleFieldsStats: async (): Promise<{
    totalTenants: number;
    totalFields: number;
    fieldsByTenant: Record<string, number>;
    fieldsByEntity: Record<string, number>;
  }> => {
    if (tenantManagementService?.getExtensibleFieldsStats) {
      return await tenantManagementService.getExtensibleFieldsStats();
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Get list of supported entities for extensible fields
   */
  getSupportedEntities: async (): Promise<string[]> => {
    if (tenantManagementService?.getSupportedEntities) {
      return await tenantManagementService.getSupportedEntities();
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Get available tables for tenant in public schema
   */
  getAvailableTables: async (): Promise<any> => {
    if (tenantManagementService?.getAvailableTables) {
      return await tenantManagementService.getAvailableTables();
    }
    throw new Error('Tenant management service not available');
  },

  /**
   * Get entity schema (standard + extensible fields)
   */
  getEntitySchema: async (params: { entityName: string }): Promise<any> => {
    if (tenantManagementService?.getEntitySchema) {
      return await tenantManagementService.getEntitySchema(params);
    }
    throw new Error('Tenant management service not available');
  },

  // ===== ENTITY CONVERSION RULES METHODS =====

  /**
   * Get conversion rules for tenant
   */
  getConversionRules: async (params: {
    sourceEntity?: string;
    isActive?: boolean;
  }): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.getConversionRules(params);
  },

  /**
   * Get conversion rule by ID
   */
  getConversionRule: async (params: { ruleId: string }): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.getConversionRule(params);
  },

  /**
   * Create new conversion rule
   */
  createConversionRule: async (params: { ruleData: any }): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.createConversionRule(params);
  },

  /**
   * Update conversion rule
   */
  updateConversionRule: async (params: {
    ruleId: string;
    ruleData: any;
  }): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.updateConversionRule(params);
  },

  /**
   * Delete conversion rule
   */
  deleteConversionRule: async (params: {
    ruleId: string;
    hardDelete?: boolean;
  }): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.deleteConversionRule(params);
  },

  /**
   * Get conversion rules statistics
   */
  getConversionRulesStats: async (): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.getConversionRulesStats();
  },

  /**
   * Validate trigger conditions
   */
  validateTriggerConditions: async (params: {
    conditions: any;
    sourceEntity: string;
  }): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.validateTriggerConditions(params);
  },

  /**
   * Get mapping suggestions between source and target entities
   * Generates smart field mapping suggestions based on schema analysis
   */
  getMappingSuggestions: async (
    tenantId: string,
    params: {
      sourceEntity: string;
      targetEntity: string;
    }
  ): Promise<any> => {
    if (!tenantManagementService) {
      throw new Error('Tenant Management service not available');
    }
    return tenantManagementService.generateMappingSuggestions({
      tenantId,
      sourceEntity: params.sourceEntity,
      targetEntity: params.targetEntity,
    });
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
  deleteEntityRecord: async (params: { entityTable: string; recordId: string }) => {
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
    if (!dataProcessingService) {
      throw new Error('Data Processing service not available');
    }
    return dataProcessingService.searchEntityRecords({
      entity: params.entity,
      filter: JSON.stringify(params.filter || {}),
      limit: params.limit,
      offset: params.offset,
      orderBy: JSON.stringify(params.orderBy || []),
    });
  },

  // ===== ENTITY CONVERSION METHODS =====

  /**
   * Execute entity conversion
   */
  executeConversion: async (params: {
    ruleId: string;
    sourceRecordId: string;
  }): Promise<any> => {
    if (!dataProcessingService) {
      throw new Error('Data Processing service not available');
    }
    return dataProcessingService.executeConversion(params);
  },

  /**
   * Get available conversion rules for entity
   */
  getAvailableRules: async (params: { sourceEntity: string }): Promise<any> => {
    if (!dataProcessingService) {
      throw new Error('Data Processing service not available');
    }
    return dataProcessingService.getAvailableRules(params);
  },

  /**
   * Check auto triggers for record
   */
  checkAutoTriggersForRecord: async (params: {
    entityTable: string;
    recordId: string;
  }): Promise<any> => {
    if (!dataProcessingService) {
      throw new Error('Data Processing service not available');
    }
    return dataProcessingService.checkAutoTriggersForRecord(params);
  },

  /**
   * Validate trigger conditions
   */
  validateConditions: async (params: {
    conditions: any;
    record: Record<string, any>;
    extensionFields?: Record<string, any>;
  }): Promise<any> => {
    if (!dataProcessingService) {
      throw new Error('Data Processing service not available');
    }
    return dataProcessingService.validateConditions(params);
  },
};

/**
 * Event Management Service Client
 * Wraps the RPC calls with proper error handling
 */
export const eventManagementClient = {
  // ===== EVENT PUBLISHING METHODS =====

  /**
   * Publish conversion event
   */
  async publishConversionEvent(params: {
    eventType: string;
    eventData: Record<string, any>;
  }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.publishConversionEvent(params);
    } catch (error) {
      console.error('Error publishing conversion event:', error);
      throw error;
    }
  },

  /**
   * Get event statistics
   */
  async getEventStats(params?: {
    tenantId?: string;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.getEventStats(params || {});
    } catch (error) {
      console.error('Error getting event stats:', error);
      throw error;
    }
  },

  // ===== AUDIT METHODS =====

  /**
   * Get audit trail for conversion activities
   */
  async getAuditTrail(params: {
    tenantId?: string;
    entityType?: string;
    entityId?: string;
    eventType?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.getAuditTrail(params);
    } catch (error) {
      console.error('Error getting audit trail:', error);
      throw error;
    }
  },

  /**
   * Get audit statistics
   */
  async getAuditStats(params?: {
    tenantId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.getAuditStats(params || {});
    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw error;
    }
  },

  // ===== NOTIFICATION METHODS =====

  /**
   * Send conversion notification
   */
  async sendConversionNotification(params: {
    eventType: string;
    event: Record<string, any>;
    recipients: Array<{ type: string; target: string }>;
    priority: string;
    template?: string;
    customData?: Record<string, any>;
  }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.sendConversionNotification(params);
    } catch (error) {
      console.error('Error sending conversion notification:', error);
      throw error;
    }
  },

  /**
   * Get notification settings for tenant
   */
  async getNotificationSettings(params: { tenantId: string }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.getNotificationSettings(params);
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  },

  /**
   * Update notification settings for tenant
   */
  async updateNotificationSettings(params: {
    tenantId: string;
    emailEnabled: boolean;
    inAppEnabled: boolean;
    webhookEnabled: boolean;
    recipients: Array<{ type: string; target: string }>;
    templates: Array<Record<string, any>>;
  }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.updateNotificationSettings(params);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  },

  /**
   * Get notification history
   */
  async getNotificationHistory(params: {
    tenantId: string;
    eventType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.getNotificationHistory(params);
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  },

  // ===== HEALTH CHECK =====

  /**
   * Health check for event management system
   */
  async healthCheck(): Promise<any> {
    try {
      if (!eventManagementService) {
        throw new Error('Event Management service not available');
      }
      return await eventManagementService.healthCheck();
    } catch (error) {
      console.error('Error in event management health check:', error);
      throw error;
    }
  }
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
    hasMore?: boolean;
  };
}
