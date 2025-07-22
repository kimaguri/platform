import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import { ConnectorRegistry } from '../../../../connectors/registry/connector-registry';
import { ResourceResolver } from '../../../../connectors/registry/resource-resolver';
import { getTenantConfigById } from '../../../../shared/tenantConfig';
import { ApiResponse } from '../../../../shared/types';
import type { AuthData } from '../../../../shared/middleware/auth/auth-handler';
import type { UserProfile, UpdateUserRequest, UpdateRoleRequest } from '../models/user';

// Initialize connector system
const connectorRegistry = new ConnectorRegistry();
const resourceResolver = new ResourceResolver(connectorRegistry);

// Helper function to get tenant config for connectors
async function getTenantConnectorConfig(tenantId: string) {
  const tenantConfig = await getTenantConfigById(tenantId);
  return {
    connectorType: 'supabase',
    config: {
      url: tenantConfig.SUPABASE_URL,
      key: tenantConfig.ANON_KEY,
    },
  };
}

/**
 * Получить список пользователей (только для админов)
 */
export const listUsers = api(
  { auth: true, method: 'GET', path: '/users', expose: true },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<UserProfile[]>> => {
    try {
      const authData = getAuthData() as AuthData;

      const users = await resourceResolver.getResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        {
          limit: limit || 50,
          offset: offset || 0,
          orderBy: 'created_at',
        },
        getTenantConnectorConfig
      );

      return {
        data: users,
        message: 'Users retrieved successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        message: 'Failed to fetch users',
      };
    }
  }
);

/**
 * Получить профиль пользователя по ID
 */
export const getUserProfile = api(
  { auth: true, method: 'GET', path: '/users/:userId', expose: true },
  async ({ userId }: { userId: string }): Promise<ApiResponse<UserProfile>> => {
    try {
      const authData = getAuthData() as AuthData;

      const users = await resourceResolver.getResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        {
          filter: { user_id: userId },
          limit: 1,
        },
        getTenantConnectorConfig
      );

      if (!users || users.length === 0) {
        return {
          error: 'User profile not found',
          message: 'User profile not found',
        };
      }

      return {
        data: users[0],
        message: 'User profile retrieved successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch user profile',
        message: 'Failed to fetch user profile',
      };
    }
  }
);

/**
 * Получить собственный профиль текущего пользователя
 */
export const getMyProfile = api(
  { auth: true, method: 'GET', path: '/users/me', expose: true },
  async (): Promise<ApiResponse<UserProfile>> => {
    try {
      const authData = getAuthData() as AuthData;

      const users = await resourceResolver.getResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        {
          filter: { user_id: authData.userID },
          limit: 1,
        },
        getTenantConnectorConfig
      );

      if (!users || users.length === 0) {
        return {
          error: 'User profile not found',
          message: 'User profile not found',
        };
      }

      return {
        data: users[0],
        message: 'Profile retrieved successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
        message: 'Failed to fetch profile',
      };
    }
  }
);

/**
 * Обновить собственный профиль
 */
export const updateMyProfile = api(
  { auth: true, method: 'PUT', path: '/users/me', expose: true },
  async (updateData: UpdateUserRequest): Promise<ApiResponse<UserProfile>> => {
    try {
      const authData = getAuthData() as AuthData;

      // Получаем ID профиля пользователя
      const existingUsers = await resourceResolver.getResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        {
          filter: { user_id: authData.userID },
          limit: 1,
        },
        getTenantConnectorConfig
      );

      if (!existingUsers || existingUsers.length === 0) {
        return {
          error: 'User profile not found',
          message: 'User profile not found',
        };
      }

      const profileId = existingUsers[0].id;

      const updatedProfile = await resourceResolver.updateResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        profileId,
        {
          ...updateData,
          updated_at: new Date().toISOString(),
        },
        getTenantConnectorConfig
      );

      return {
        data: updatedProfile,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to update profile',
        message: 'Failed to update profile',
      };
    }
  }
);

/**
 * Обновить роль и права пользователя (только для админов)
 */
export const updateUserRole = api(
  { auth: true, method: 'PUT', path: '/users/:userId/role', expose: true },
  async ({ userId, role, permissions }: UpdateRoleRequest): Promise<ApiResponse<UserProfile>> => {
    try {
      const authData = getAuthData() as AuthData;

      // Получаем ID профиля пользователя
      const existingUsers = await resourceResolver.getResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        {
          filter: { user_id: userId },
          limit: 1,
        },
        getTenantConnectorConfig
      );

      if (!existingUsers || existingUsers.length === 0) {
        return {
          error: 'User profile not found',
          message: 'User profile not found',
        };
      }

      const profileId = existingUsers[0].id;

      const updatedProfile = await resourceResolver.updateResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        profileId,
        {
          role,
          permissions: permissions || existingUsers[0].permissions,
          updated_at: new Date().toISOString(),
        },
        getTenantConnectorConfig
      );

      return {
        data: updatedProfile,
        message: 'User role updated successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to update user role',
        message: 'Failed to update user role',
      };
    }
  }
);

/**
 * Деактивировать пользователя (только для админов)
 */
export const deactivateUser = api(
  { auth: true, method: 'DELETE', path: '/users/:userId', expose: true },
  async ({ userId }: { userId: string }): Promise<ApiResponse<boolean>> => {
    try {
      const authData = getAuthData() as AuthData;

      // Получаем ID профиля пользователя
      const existingUsers = await resourceResolver.getResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        {
          filter: { user_id: userId },
          limit: 1,
        },
        getTenantConnectorConfig
      );

      if (!existingUsers || existingUsers.length === 0) {
        return {
          error: 'User profile not found',
          message: 'User profile not found',
        };
      }

      const profileId = existingUsers[0].id;

      // Вместо удаления, помечаем как неактивного
      await resourceResolver.updateResource<UserProfile>(
        authData.tenantId,
        'user_profiles',
        profileId,
        {
          role: 'inactive',
          updated_at: new Date().toISOString(),
        },
        getTenantConnectorConfig
      );

      return {
        data: true,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to deactivate user',
        message: 'Failed to deactivate user',
      };
    }
  }
);
