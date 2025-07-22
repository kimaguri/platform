import { api, Header } from 'encore.dev/api';
import { ApiResponse } from '../../shared/types';
import type { ServiceRoute, RouteMatch } from '../src/models/gateway';

// User data interfaces for API endpoints
interface UserLoginData {
  tenantId: Header<'X-Tenant-ID'>;
  email: string;
  password: string;
}

interface UserRegisterData {
  tenantId: Header<'X-Tenant-ID'>;
  email: string;
  password: string;
  userData?: UserProfileData;
}

interface UserProfileData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  preferences?: Record<string, any>;
}

interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  preferences?: Record<string, any>;
}

interface UserRoleData {
  role: string;
  permissions?: string[];
}

interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresAt: string;
  user: UserResponse;
}

interface UserResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  role: string;
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersListResponse {
  users: UserResponse[];
  total: number;
  limit: number;
  offset: number;
}

// User management service routes configuration
export const userRoutes: ServiceRoute = {
  serviceName: 'user-management',
  basePath: '/api/v1/auth',
  version: 'v1',
};

export const userProfileRoutes: ServiceRoute = {
  serviceName: 'user-management',
  basePath: '/api/v1/users',
  version: 'v1',
};

/**
 * Authentication routes
 */

// User Login (renamed to avoid conflict with gateway auth.ts)
export const userLogin = api(
  { method: 'POST', path: '/api/v1/auth/login', expose: true },
  async (data: UserLoginData): Promise<ApiResponse<AuthResponse | null>> => {
    return {
      message: 'Login handled by user-management service',
      data: null,
    };
  }
);

// Register
export const register = api(
  { method: 'POST', path: '/api/v1/auth/register', expose: true },
  async (data: UserRegisterData): Promise<ApiResponse<AuthResponse | null>> => {
    return {
      message: 'Registration handled by user-management service',
      data: null,
    };
  }
);

// User Logout (renamed to avoid conflict with gateway auth.ts)
export const userLogout = api(
  { method: 'POST', path: '/api/v1/auth/logout', expose: true },
  async ({
    tenantId,
  }: {
    tenantId: Header<'X-Tenant-ID'>;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return {
      message: 'Logout handled by user-management service',
      data: { success: true },
    };
  }
);

// Reset password
export const resetPassword = api(
  { method: 'POST', path: '/api/v1/auth/reset-password', expose: true },
  async (data: {
    tenantId: Header<'X-Tenant-ID'>;
    email: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return {
      message: 'Password reset handled by user-management service',
      data: { success: true },
    };
  }
);

// Update password
export const updatePassword = api(
  { method: 'PUT', path: '/api/v1/auth/update-password', expose: true },
  async (data: {
    tenantId: Header<'X-Tenant-ID'>;
    password: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return {
      message: 'Password update handled by user-management service',
      data: { success: true },
    };
  }
);

/**
 * User profile routes
 */

// List users
export const listUsers = api(
  { auth: true, method: 'GET', path: '/api/v1/users', expose: true },
  async ({
    limit,
    offset,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<UsersListResponse>> => {
    return {
      message: 'User listing handled by user-management service',
      data: { users: [], total: 0, limit: limit || 10, offset: offset || 0 },
    };
  }
);

// Get user profile
export const getUserProfile = api(
  { auth: true, method: 'GET', path: '/api/v1/users/:userId', expose: true },
  async ({ userId }: { userId: string }): Promise<ApiResponse<UserResponse | null>> => {
    return {
      message: `User profile ${userId} handled by user-management service`,
      data: null,
    };
  }
);

// Get my profile
export const getMyProfile = api(
  { auth: true, method: 'GET', path: '/api/v1/users/me', expose: true },
  async (): Promise<ApiResponse<UserResponse | null>> => {
    return {
      message: 'My profile handled by user-management service',
      data: null,
    };
  }
);

// Update my profile
export const updateMyProfile = api(
  { auth: true, method: 'PUT', path: '/api/v1/users/me', expose: true },
  async (data: UserUpdateData): Promise<ApiResponse<UserResponse | null>> => {
    return {
      message: 'Profile update handled by user-management service',
      data: null,
    };
  }
);

// Update user role
export const updateUserRole = api(
  { auth: true, method: 'PUT', path: '/api/v1/users/:userId/role', expose: true },
  async ({
    userId,
    ...data
  }: { userId: string } & UserRoleData): Promise<ApiResponse<UserResponse | null>> => {
    return {
      message: `Role update for user ${userId} handled by user-management service`,
      data: null,
    };
  }
);

// Deactivate user
export const deactivateUser = api(
  { auth: true, method: 'DELETE', path: '/api/v1/users/:userId', expose: true },
  async ({ userId }: { userId: string }): Promise<ApiResponse<{ success: boolean }>> => {
    return {
      message: `User ${userId} deactivation handled by user-management service`,
      data: { success: true },
    };
  }
);

/**
 * Route matching functions
 */
export function matchAuthRoute(path: string, method: string): RouteMatch | null {
  const basePath = userRoutes.basePath;

  if (!path.startsWith(basePath)) {
    return null;
  }

  const relativePath = path.substring(basePath.length);
  const pathParams: Record<string, string> = {};

  const patterns = [
    { pattern: /^\/login$/, targetPath: '/auth/login' },
    { pattern: /^\/register$/, targetPath: '/auth/register' },
    { pattern: /^\/logout$/, targetPath: '/auth/logout' },
    { pattern: /^\/reset-password$/, targetPath: '/auth/reset-password' },
    { pattern: /^\/update-password$/, targetPath: '/auth/update-password' },
  ];

  for (const { pattern, targetPath } of patterns) {
    if (pattern.test(relativePath)) {
      return {
        service: userRoutes,
        targetPath,
        pathParams,
      };
    }
  }

  return null;
}

export function matchUserRoute(path: string, method: string): RouteMatch | null {
  const basePath = userProfileRoutes.basePath;

  if (!path.startsWith(basePath)) {
    return null;
  }

  const relativePath = path.substring(basePath.length);
  const pathParams: Record<string, string> = {};

  const patterns = [
    { pattern: /^$/, targetPath: '/users' }, // /api/v1/users
    { pattern: /^\/me$/, targetPath: '/users/me' }, // /api/v1/users/me
    { pattern: /^\/([^\/]+)$/, targetPath: '/users/$1', params: ['userId'] }, // /api/v1/users/:id
    { pattern: /^\/([^\/]+)\/role$/, targetPath: '/users/$1/role', params: ['userId'] }, // /api/v1/users/:id/role
  ];

  for (const { pattern, targetPath, params } of patterns) {
    const match = relativePath.match(pattern);
    if (match) {
      let resolvedPath = targetPath;

      if (params && match.length > 1) {
        params.forEach((param, index) => {
          pathParams[param] = match[index + 1];
          resolvedPath = resolvedPath.replace(`$${index + 1}`, match[index + 1]);
        });
      }

      return {
        service: userProfileRoutes,
        targetPath: resolvedPath,
        pathParams,
      };
    }
  }

  return null;
}
