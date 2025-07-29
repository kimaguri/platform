import { api, Query, Header } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { userManagementClient, type ApiResponse } from '../utils/service-clients';

// Bootstrap data interfaces
interface AppBootstrapData {
  user: {
    id: string;
    full_name: string;
    organization_id: string;
    position_id: string;
    position: {
      id: string;
      name: string;
      position_role: {
        role_id: string;
        role: {
          id: string;
          code: string;
          name: string;
          description?: string;
          inherits?: string[];
          restrict_assign_activity: boolean;
        };
      }[];
    };
  };
  dictionaries: {
    id: string;
    code: string;
    name: string;
    description?: string;
    is_active: boolean;
    dictionary_value: {
      id: string;
      dictionary_id: string;
      value: string;
      label?: string;
      description?: string;
      sort_order?: number;
      is_active: boolean;
    }[];
  }[];
  configParameters: {
    id: string;
    key: string;
    value: string;
    type: 'string' | 'number' | 'boolean' | 'json';
    description?: string;
    is_active: boolean;
  }[];
  resources: {
    id: string;
    code: string;
    name: string;
    description?: string;
    resource_type: string;
    is_active: boolean;
  }[];
  permissions: {
    id: string;
    code: string;
    name: string;
    description?: string;
    resource_id: string;
    action: string;
    is_active: boolean;
  }[];
}

// Request/Response interfaces

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: string;
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
}

/**
 * Authentication Endpoints - /api/v1/auth/*
 */









/**
 * User Management Endpoints - /api/v1/users/*
 */

export const getCurrentUser = api(
  { method: 'GET', path: '/api/v1/users/me', expose: true, auth: true },
  async (): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;

    try {
      // Proxy to user-management service
      const result = await userManagementClient.getUser({
        tenantId: authData.tenantId,
        userID: authData.userID,
      });

      return {
        data: result,
        message: 'User profile retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const updateCurrentUser = api(
  { method: 'PUT', path: '/api/v1/users/me', expose: true, auth: true },
  async (data: UpdateUserRequest): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;

    try {
      // Proxy to user-management service
      const result = await userManagementClient.updateUser({
        tenantId: authData.tenantId,
        userID: authData.userID,
        ...data,
      });

      return {
        data: result,
        message: 'User profile updated',
      };
    } catch (error) {
      throw new Error(
        `Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const getUserById = api(
  { method: 'GET', path: '/api/v1/users/:id', expose: true, auth: true },
  async ({ id }: { id: string }): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;

    try {
      // Proxy to user-management service
      const result = await userManagementClient.getUser({
        tenantId: authData.tenantId,
        userID: id,
      });

      return {
        data: result,
        message: 'User retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const listUsers = api(
  { method: 'GET', path: '/api/v1/users', expose: true, auth: true },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<UserProfile[]>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has admin permissions
    if (!authData.permissions?.includes('users:read') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to list users');
    }

    try {
      // Proxy to user-management service
      const result = await userManagementClient.listUsers({
        limit: limit || 50,
        offset: offset || 0,
      });

      return {
        data: (result as any)?.users || [],
        message: 'Users retrieved',
        meta: {
          total: (result as any)?.total || 0,
          limit: limit || 50,
          page: Math.floor((offset || 0) / (limit || 50)) + 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to list users: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get application bootstrap data
 * Loads all essential data needed for app initialization in one request
 */
export const getAppBootstrap = api(
  { method: 'GET', path: '/api/v1/bootstrap', expose: true, auth: true },
  async (): Promise<ApiResponse<AppBootstrapData>> => {
    const authData = getAuthData() as AuthData;

    try {
      // Proxy to user-management service
      const result = await userManagementClient.getAppBootstrap();

      return {
        data: result.data,
        message: result.message || 'Bootstrap data loaded successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to load bootstrap data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
