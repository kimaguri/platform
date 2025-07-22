import { api, Header } from 'encore.dev/api';
import { ApiResponse } from '../../shared/types';
import type { ServiceRoute, RouteMatch } from '../src/models/gateway';

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

// Login
export const login = api(
  { method: 'POST', path: '/api/v1/auth/login', expose: true },
  async (data: {
    tenantId: Header<'X-Tenant-ID'>;
    email: string;
    password: string;
  }): Promise<ApiResponse<any>> => {
    return {
      message: 'Login handled by user-management service',
      data: null,
    };
  }
);

// Register
export const register = api(
  { method: 'POST', path: '/api/v1/auth/register', expose: true },
  async (data: {
    tenantId: Header<'X-Tenant-ID'>;
    email: string;
    password: string;
    userData?: any;
  }): Promise<ApiResponse<any>> => {
    return {
      message: 'Registration handled by user-management service',
      data: null,
    };
  }
);

// Logout
export const logout = api(
  { method: 'POST', path: '/api/v1/auth/logout', expose: true },
  async ({ tenantId }: { tenantId: Header<'X-Tenant-ID'> }): Promise<ApiResponse<any>> => {
    return {
      message: 'Logout handled by user-management service',
      data: null,
    };
  }
);

// Reset password
export const resetPassword = api(
  { method: 'POST', path: '/api/v1/auth/reset-password', expose: true },
  async (data: { tenantId: Header<'X-Tenant-ID'>; email: string }): Promise<ApiResponse<any>> => {
    return {
      message: 'Password reset handled by user-management service',
      data: null,
    };
  }
);

// Update password
export const updatePassword = api(
  { method: 'PUT', path: '/api/v1/auth/update-password', expose: true },
  async (data: {
    tenantId: Header<'X-Tenant-ID'>;
    password: string;
  }): Promise<ApiResponse<any>> => {
    return {
      message: 'Password update handled by user-management service',
      data: null,
    };
  }
);

/**
 * User profile routes
 */

// List users
export const listUsers = api(
  { auth: true, method: 'GET', path: '/api/v1/users', expose: true },
  async ({ limit, offset }: { limit?: number; offset?: number }): Promise<ApiResponse<any>> => {
    return {
      message: 'User listing handled by user-management service',
      data: null,
    };
  }
);

// Get user profile
export const getUserProfile = api(
  { auth: true, method: 'GET', path: '/api/v1/users/:userId', expose: true },
  async ({ userId }: { userId: string }): Promise<ApiResponse<any>> => {
    return {
      message: `User profile ${userId} handled by user-management service`,
      data: null,
    };
  }
);

// Get my profile
export const getMyProfile = api(
  { auth: true, method: 'GET', path: '/api/v1/users/me', expose: true },
  async (): Promise<ApiResponse<any>> => {
    return {
      message: 'My profile handled by user-management service',
      data: null,
    };
  }
);

// Update my profile
export const updateMyProfile = api(
  { auth: true, method: 'PUT', path: '/api/v1/users/me', expose: true },
  async (data: any): Promise<ApiResponse<any>> => {
    return {
      message: 'Profile update handled by user-management service',
      data: null,
    };
  }
);

// Update user role
export const updateUserRole = api(
  { auth: true, method: 'PUT', path: '/api/v1/users/:userId/role', expose: true },
  async ({ userId, ...data }: { userId: string } & any): Promise<ApiResponse<any>> => {
    return {
      message: `Role update for user ${userId} handled by user-management service`,
      data: null,
    };
  }
);

// Deactivate user
export const deactivateUser = api(
  { auth: true, method: 'DELETE', path: '/api/v1/users/:userId', expose: true },
  async ({ userId }: { userId: string }): Promise<ApiResponse<any>> => {
    return {
      message: `User ${userId} deactivation handled by user-management service`,
      data: null,
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
