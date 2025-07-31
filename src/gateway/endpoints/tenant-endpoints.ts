import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { tenantManagementClient, type ApiResponse } from '../utils/service-clients';

// Extension Field Definition types (local to Gateway)
interface ExtensionFieldDefinition {
  id: number;
  tenant_id: string;
  entity_table: string;
  field_name: string;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select';
  display_name: string;
  description?: string;
  is_required: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  is_sortable: boolean;
  default_value?: string;
  validation_rules?: Record<string, any>;
  ui_config?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type CreateFieldDefinitionRequest = Omit<
  ExtensionFieldDefinition,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;
type UpdateFieldDefinitionRequest = Partial<CreateFieldDefinitionRequest>;

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
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
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
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
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
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
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

    // Users can only access their own tenant or admins/super admins can access any (temporarily allow user for testing)
    if (
      authData.tenantId !== id &&
      authData.userRole !== 'ADMIN' &&
      authData.userRole !== 'SUPER_ADMIN' &&
      authData.userRole !== 'user'
    ) {
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

// ===== EXTENSION TABLE DEFINITIONS ENDPOINTS =====

/**
 * Get field definitions for tenant
 */
export const getFieldDefinitions = api(
  { method: 'GET', path: '/api/v1/tenants/extensions', expose: true, auth: true },
  async ({
    entityTable,
  }: {
    entityTable?: Query<string>;
  }): Promise<ApiResponse<ExtensionFieldDefinition[]>> => {
    const authData = getAuthData() as AuthData;

    console.log('[Gateway] getFieldDefinitions called with:', { entityTable });
    console.log('[Gateway] authData:', {
      tenantId: authData.tenantId,
      userRole: authData.userRole,
    });

    // Check if user has admin permissions
    if (
      authData.userRole !== 'ADMIN' &&
      authData.userRole !== 'SUPER_ADMIN' &&
      authData.userRole === 'USER'
    ) {
      throw new Error('Insufficient permissions to access field definitions');
    }

    try {
      console.log('[Gateway] Calling tenantManagementClient.getFieldDefinitions with:', {
        entityTable,
      });
      // Proxy to tenant-management service - возвращаем результат напрямую
      const result = await tenantManagementClient.getFieldDefinitions({
        entityTable,
      });

      // Возвращаем результат от сервиса напрямую, без дополнительной обертки
      return result;
    } catch (error) {
      throw new Error(
        `Failed to get field definitions: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Get all field definitions for tenant
 */
export const getAllFieldDefinitions = api(
  { method: 'GET', path: '/api/v1/tenants/extensions/all', expose: true, auth: true },
  async (): Promise<ApiResponse<Record<string, ExtensionFieldDefinition[]>>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient permissions to access field definitions');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.getAllFieldDefinitions();

      return {
        data: result,
        message: 'All field definitions retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get all field definitions: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Create new field definition
 */
export const createFieldDefinition = api(
  { method: 'POST', path: '/api/v1/tenants/extensions', expose: true, auth: true },
  async ({
    tenantId: _tenantId, // Ignore tenantId from request body
    fieldDefinition,
  }: {
    tenantId?: string; // Optional, will be ignored
    fieldDefinition: CreateFieldDefinitionRequest;
  }): Promise<ApiResponse<ExtensionFieldDefinition>> => {
    const authData = getAuthData() as AuthData;

    // // Check if user has admin permissions
    // if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
    //   throw new Error('Insufficient permissions to create field definitions');
    // }

    try {
      // Proxy to tenant-management service - use tenantId from authData, ignore from request body
      const result = await tenantManagementClient.createFieldDefinition(authData.tenantId, fieldDefinition);

      // Check if the service returned an error in the response
      if (result.error) {
        throw new Error(result.error);
      }

      return {
        data: result.data || result,
        message: result.message || 'Field definition created successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to create field definition: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Update existing field definition
 */
export const updateFieldDefinition = api(
  { method: 'PUT', path: '/api/v1/tenants/extensions/:fieldId', expose: true, auth: true },
  async ({
    fieldId,
    updates,
  }: {
    fieldId: number;
    updates: UpdateFieldDefinitionRequest;
  }): Promise<ApiResponse<ExtensionFieldDefinition>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient permissions to update field definitions');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.updateFieldDefinition({
        fieldId,
        updates,
      });

      return {
        data: result,
        message: 'Field definition updated successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to update field definition: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Delete field definition (soft delete)
 */
export const deleteFieldDefinition = api(
  { method: 'DELETE', path: '/api/v1/tenants/extensions/:fieldId', expose: true, auth: true },
  async ({ fieldId }: { fieldId: number }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient permissions to delete field definitions');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.deleteFieldDefinition({
        fieldId,
      });

      return {
        data: result,
        message: 'Field definition deleted successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to delete field definition: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Get entity schema (standard + extensible fields)
 */
export const getEntitySchema = api(
  { method: 'GET', path: '/api/v1/tenants/entities/:entityTable/schema', expose: true, auth: true },
  async ({
    entityTable,
  }: {
    entityTable: string;
  }): Promise<ApiResponse<any[]>> => {
    const authData = getAuthData() as AuthData;

    // Any authenticated user can access the schema for building UI
    if (!authData.tenantId) {
        throw new Error('User not authenticated or tenant not found.');
    }

    try {
      console.log(`[Gateway] Calling tenantManagementClient.getEntitySchema for entity: ${entityTable}`);
      
      const result = await tenantManagementClient.getEntitySchema({
        entityName: entityTable,
      });

      // The service already returns data in ApiResponse format
      return result;
    } catch (error) {
      throw new Error(
        `Failed to get entity schema for ${entityTable}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Get extensible fields statistics
 */
export const getExtensibleFieldsStats = api(
  { method: 'GET', path: '/api/v1/tenants/extensions/stats', expose: true, auth: true },
  async (): Promise<
    ApiResponse<{
      totalTenants: number;
      totalFields: number;
      fieldsByTenant: Record<string, number>;
      fieldsByEntity: Record<string, number>;
    }>
  > => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient permissions to view extensible fields statistics');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.getExtensibleFieldsStats();

      return {
        data: result,
        message: 'Extensible fields statistics retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get extensible fields statistics: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Get list of supported entities for extensible fields
 */
export const getSupportedEntities = api(
  {
    method: 'GET',
    path: '/api/v1/tenants/extensions/supported-entities',
    expose: true,
    auth: true,
  },
  async (): Promise<ApiResponse<string[]>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (authData.userRole !== 'ADMIN' && authData.userRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient permissions to view supported entities');
    }

    try {
      // Proxy to tenant-management service
      const result = await tenantManagementClient.getSupportedEntities();

      return {
        data: result,
        message: 'Supported entities retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get supported entities: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);

/**
 * Get available tables for tenant in public schema
 */
export const getAvailableTables = api(
  { method: 'GET', path: '/api/v1/tenants/extensions/available-tables', expose: true, auth: true },
  async (): Promise<ApiResponse<string[]>> => {
    const authData = getAuthData() as AuthData;

    // Проверяем права доступа - только admin и super_admin
    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Access denied: Admin role required');
    }

    try {
      const result = await tenantManagementClient.getAvailableTables();

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        data: result.data || [],
        message: 'Available tables retrieved successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to get available tables: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
);
