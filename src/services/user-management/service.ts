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
 * Authentication - Login user
 * Uses ResourceResolver and proper connectors
 */
export async function login(params: { tenantId: string; email: string; password: string }): Promise<
  ApiResponse<{
    token: string;
    refreshToken?: string;
    expiresAt: string;
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      role: string;
    };
  }>
> {
  try {
    const { getTenantConfigById } = await import('../../lib/utils/tenant-config');
    const { createClient } = await import('@supabase/supabase-js');

    // Get tenant configuration through proper config system
    const tenantConfig = await getTenantConfigById(params.tenantId);
    if (!tenantConfig) {
      return {
        error: 'Tenant not found or inactive',
        message: 'Authentication failed',
      };
    }

    // Create Supabase client for this tenant
    const supabase = createClient(tenantConfig.SUPABASE_URL, tenantConfig.ANON_KEY);

    // Authenticate user with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (authError || !authData.user) {
      return {
        error: authError?.message || 'Authentication failed',
        message: 'Authentication failed',
      };
    }

    // Get user profile through ResourceResolver
    let profile;
    try {
      const profiles = await queryResource(params.tenantId, 'profiles', {
        filter: { id: authData.user.id },
        limit: 1,
      });
      profile = profiles[0];
    } catch (error) {
      console.warn('Could not fetch user profile through ResourceResolver:', error);
    }

    const result = {
      token: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token,
      expiresAt: new Date(
        authData.session?.expires_at ? authData.session.expires_at * 1000 : Date.now() + 3600000
      ).toISOString(),
      user: {
        id: authData.user.id,
        email: authData.user.email || params.email,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        displayName: profile?.display_name || profile?.first_name || authData.user.email,
        role: profile?.role || 'user',
      },
    };

    return {
      data: result,
      message: 'Login successful',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Authentication failed',
      message: 'Authentication failed',
    };
  }
}

/**
 * Authentication - Register user
 * Uses ResourceResolver and proper connectors
 */
export async function register(params: {
  tenantId: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}): Promise<
  ApiResponse<{
    token: string;
    refreshToken?: string;
    expiresAt: string;
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      role: string;
    };
  }>
> {
  try {
    const { getTenantConfigById } = await import('../../lib/utils/tenant-config');
    const { createClient } = await import('@supabase/supabase-js');
    const { createResource } = await import('../../connectors/registry/resource-resolver');

    // Get tenant configuration through proper config system
    const tenantConfig = await getTenantConfigById(params.tenantId);
    if (!tenantConfig) {
      return {
        error: 'Tenant not found or inactive',
        message: 'Registration failed',
      };
    }

    // Create Supabase client for this tenant
    const supabase = createClient(tenantConfig.SUPABASE_URL, tenantConfig.ANON_KEY);

    // Register user with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          first_name: params.firstName,
          last_name: params.lastName,
          display_name: params.displayName || params.firstName || params.email,
        },
      },
    });

    if (authError || !authData.user) {
      return {
        error: authError?.message || 'Registration failed',
        message: 'Registration failed',
      };
    }

    // Create user profile through ResourceResolver (proper connector approach)
    let profile;
    try {
      profile = await createResource(params.tenantId, 'profiles', {
        id: authData.user.id,
        email: authData.user.email,
        first_name: params.firstName,
        last_name: params.lastName,
        display_name: params.displayName || params.firstName || params.email,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Could not create user profile through ResourceResolver:', error);
    }

    const result = {
      token: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token,
      expiresAt: new Date(
        authData.session?.expires_at ? authData.session.expires_at * 1000 : Date.now() + 3600000
      ).toISOString(),
      user: {
        id: authData.user.id,
        email: authData.user.email || params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        displayName: params.displayName || params.firstName || params.email,
        role: 'user',
      },
    };

    return {
      data: result,
      message: 'Registration successful',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Registration failed',
      message: 'Registration failed',
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

    const userData = userResult.status === 'fulfilled' ? userResult.value[0] : null;
    const dictionaries = dictionariesResult.status === 'fulfilled' ? dictionariesResult.value : [];
    const resources = resourcesResult.status === 'fulfilled' ? resourcesResult.value : [];
    const permissions = permissionsResult.status === 'fulfilled' ? permissionsResult.value : [];

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
