import type { ApiResponse } from '../../lib/types';
import type {
  UserProfile,
  UpdateUserRequest,
  AppBootstrapData,
  EmployeeData,
  Dictionary,
  ConfigParameter,
  Resource,
  Permission,
} from './src/models/user';
import {
  queryResource,
  getResource,
  updateResource,
  countResources,
  queryResourcesPaginated,
} from '../../connectors/registry/resource-resolver';

/**
 * User Management Business Logic
 * Functional approach using ResourceResolver
 * No classes - pure functions only
 */

/**
 * Get user list with pagination
 */
export async function getUserList(
  tenantId: string,
  params: { limit?: number; offset?: number }
): Promise<ApiResponse<UserProfile[]>> {
  try {
    const { limit = 50, offset = 0 } = params;

    const users = await queryResource<UserProfile>(tenantId, 'user_profiles', {
      limit,
      offset,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      filter: { role: { $ne: 'inactive' } }, // Exclude inactive users
    });

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

/**
 * Get user profile by user ID
 */
export async function getUserProfileById(
  tenantId: string,
  userId: string
): Promise<ApiResponse<UserProfile>> {
  try {
    const users = await queryResource<UserProfile>(tenantId, 'employee', {
      filter: { user_id: userId },
      limit: 1,
    });

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

/**
 * Update user profile
 */
export async function updateUserProfile(
  tenantId: string,
  userId: string,
  updateData: UpdateUserRequest
): Promise<ApiResponse<UserProfile>> {
  try {
    // First, get the profile ID
    const users = await queryResource<UserProfile>(tenantId, 'user_profiles', {
      filter: { user_id: userId },
      limit: 1,
    });

    if (!users || users.length === 0) {
      return {
        error: 'User profile not found',
        message: 'User profile not found',
      };
    }

    const profileId = users[0]?.id;
    if (!profileId) {
      return {
        error: 'Invalid user profile data',
        message: 'Invalid user profile data',
      };
    }

    // Update the profile
    const updatedProfile = await updateResource<UserProfile>(tenantId, 'user_profiles', profileId, {
      ...updateData,
      updated_at: new Date().toISOString(),
    });

    if (!updatedProfile) {
      return {
        error: 'Failed to update profile',
        message: 'Failed to update profile',
      };
    }

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

/**
 * Update user role and permissions
 */
export async function updateUserRole(
  tenantId: string,
  userId: string,
  roleData: { role: string; permissions?: string[] }
): Promise<ApiResponse<UserProfile>> {
  try {
    // First, get the profile ID
    const users = await queryResource<UserProfile>(tenantId, 'user_profiles', {
      filter: { user_id: userId },
      limit: 1,
    });

    if (!users || users.length === 0) {
      return {
        error: 'User profile not found',
        message: 'User profile not found',
      };
    }

    const profileId = users[0]?.id;
    if (!profileId) {
      return {
        error: 'Invalid user profile data',
        message: 'Invalid user profile data',
      };
    }

    // Update the role and permissions
    const updatedProfile = await updateResource<UserProfile>(tenantId, 'user_profiles', profileId, {
      role: roleData.role,
      permissions: roleData.permissions || users[0]?.permissions || [],
      updated_at: new Date().toISOString(),
    });

    if (!updatedProfile) {
      return {
        error: 'Failed to update user role',
        message: 'Failed to update user role',
      };
    }

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

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(
  tenantId: string,
  userId: string
): Promise<ApiResponse<boolean>> {
  try {
    // First, get the profile ID
    const users = await queryResource<UserProfile>(tenantId, 'user_profiles', {
      filter: { user_id: userId },
      limit: 1,
    });

    if (!users || users.length === 0) {
      return {
        error: 'User profile not found',
        message: 'User profile not found',
      };
    }

    const profileId = users[0]?.id;
    if (!profileId) {
      return {
        error: 'Invalid user profile data',
        message: 'Invalid user profile data',
      };
    }

    // Mark as inactive instead of deleting
    await updateResource<UserProfile>(tenantId, 'user_profiles', profileId, {
      role: 'inactive',
      updated_at: new Date().toISOString(),
    });

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

/**
 * Get user statistics
 */
export async function getUserStats(tenantId: string): Promise<
  ApiResponse<{
    total: number;
    active: number;
    inactive: number;
  }>
> {
  try {
    const [total, inactive] = await Promise.all([
      countResources(tenantId, 'user_profiles'),
      countResources(tenantId, 'user_profiles', { role: 'inactive' }),
    ]);

    return {
      data: {
        total,
        active: total - inactive,
        inactive,
      },
      message: 'User statistics retrieved successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch user statistics',
      message: 'Failed to fetch user statistics',
    };
  }
}

/**
 * Search users by name or email
 */
export async function searchUsers(
  tenantId: string,
  query: string,
  limit: number = 20
): Promise<ApiResponse<UserProfile[]>> {
  try {
    // This is a simplified search - in real implementation,
    // you would use full-text search capabilities of your adapter
    const users = await queryResource<UserProfile>(tenantId, 'user_profiles', {
      filter: {
        $or: [
          { first_name: { $ilike: `%${query}%` } },
          { last_name: { $ilike: `%${query}%` } },
          { email: { $ilike: `%${query}%` } },
        ],
        role: { $ne: 'inactive' },
      },
      limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    });

    return {
      data: users,
      message: 'Users found successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to search users',
      message: 'Failed to search users',
    };
  }
}





/**
 * Get application bootstrap data
 * Loads all essential data needed for app initialization in one request
 */
export async function getAppBootstrapData(
  tenantId: string,
  userId: string
): Promise<ApiResponse<AppBootstrapData>> {
  try {
    // Параллельная загрузка всех необходимых данных
    const [userResult, dictionariesResult, resourcesResult, permissionsResult] =
      await Promise.allSettled([
        // 1. Загрузка данных пользователя с ролями и позициями
        queryResource<EmployeeData>(tenantId, 'employee', {
          filter: { user_id: userId },
          limit: 1,
          meta: {
            select: `
            id,
            full_name,
            organization_id,
            position_id,
            user_id,
            position (
              id,
              name,
              position_role (
                id,
                position_id,
                role_id,
                role (
                  id,
                  code,
                  name,
                  description,
                  inherits,
                  restrict_assign_activity
                )
              )
            )
          `,
          },
        }),

        // 2. Загрузка справочников с вложенными значениями
        queryResource<Dictionary>(tenantId, 'dictionary', {
          meta: {
            select: '*, dictionary_value(*)',
          },
        }),

        // 3. Загрузка ресурсов системы разрешений (глобальные)
        queryResource<Resource>(tenantId, 'resource', {
          meta: {
            select: '*, parent:resource(id, code, name)',
          },
        }),

        // 4. Загрузка разрешений (глобальные)
        queryResource<Permission>(tenantId, 'permission', {
          meta: {
            select: '*, resource:resource(id, code, name, description)',
          },
        }),
      ]);

    // Детальная диагностика результатов
    console.log('[Bootstrap] userResult status:', userResult.status);
    if (userResult.status === 'fulfilled') {
      console.log('[Bootstrap] userResult.value:', userResult.value);
      console.log('[Bootstrap] userResult.value length:', userResult.value?.length);
    } else {
      console.log('[Bootstrap] userResult error:', userResult.reason);
    }

    const userData = userResult.status === 'fulfilled' ? userResult.value[0] : null;
    const dictionaries = dictionariesResult.status === 'fulfilled' ? dictionariesResult.value : [];
    const resources = resourcesResult.status === 'fulfilled' ? resourcesResult.value : [];
    const permissions = permissionsResult.status === 'fulfilled' ? permissionsResult.value : [];

    console.log('[Bootstrap] Final userData:', userData);
    console.log('[Bootstrap] tenantId:', tenantId, 'userId:', userId);
    console.log('[Bootstrap] dictionaries count:', dictionaries.length);
    console.log('[Bootstrap] resources count:', resources.length);
    console.log('[Bootstrap] permissions count:', permissions.length);

    if (userData) {
      console.log('[Bootstrap] User position_role data:', userData.position?.position_role);
    }

    // Проверяем, что пользователь найден
    if (!userData) {
      return {
        error: 'User not found',
        message: 'User data not found',
      };
    }

    // Собираем ошибки, если они есть
    const errors: string[] = [];
    if (userResult.status === 'rejected') errors.push(`User data: ${userResult.reason}`);
    if (dictionariesResult.status === 'rejected')
      errors.push(`Dictionaries: ${dictionariesResult.reason}`);
    if (resourcesResult.status === 'rejected') errors.push(`Resources: ${resourcesResult.reason}`);
    if (permissionsResult.status === 'rejected')
      errors.push(`Permissions: ${permissionsResult.reason}`);

    // Формируем ответ
    const bootstrapData: AppBootstrapData = {
      user: userData,
      dictionaries,
      configParameters: [], // Таблица config_parameters не существует в БД
      resources,
      permissions,
    };

    return {
      data: bootstrapData,
      message:
        errors.length > 0
          ? `Bootstrap data loaded with warnings: ${errors.join('; ')}`
          : 'Bootstrap data loaded successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to load bootstrap data',
      message: 'Failed to load bootstrap data',
    };
  }
}


