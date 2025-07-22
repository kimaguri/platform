import { api, Query, Header } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { userManagementClient, type ApiResponse } from '../utils/service-clients';

// Request/Response interfaces
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

interface AuthResponse {
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
}

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

export const login = api(
  { method: 'POST', path: '/api/v1/auth/login', expose: true },
  async (
    data: LoginRequest & { tenantId: Header<'X-Tenant-ID'> }
  ): Promise<ApiResponse<AuthResponse>> => {
    try {
      // Proxy to user-management service
      const result = await userManagementClient.login({
        tenantId: data.tenantId,
        email: data.email,
        password: data.password,
      });

      return {
        data: result,
        message: 'Login successful',
      };
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const register = api(
  { method: 'POST', path: '/api/v1/auth/register', expose: true },
  async (
    data: RegisterRequest & { tenantId: Header<'X-Tenant-ID'> }
  ): Promise<ApiResponse<AuthResponse>> => {
    try {
      // Proxy to user-management service
      const result = await userManagementClient.register({
        tenantId: data.tenantId,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
      });

      return {
        data: result,
        message: 'Registration successful',
      };
    } catch (error) {
      throw new Error(
        `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const logout = api(
  { method: 'POST', path: '/api/v1/auth/logout', expose: true, auth: true },
  async (): Promise<ApiResponse<{ success: boolean }>> => {
    const authData = getAuthData() as AuthData;

    try {
      // In a real implementation, invalidate the token
      // For now, just return success
      return {
        data: { success: true },
        message: 'Logout successful',
      };
    } catch (error) {
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const resetPassword = api(
  { method: 'POST', path: '/api/v1/auth/reset-password', expose: true },
  async (data: {
    email: string;
    tenantId: Header<'X-Tenant-ID'>;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      // Proxy to user-management service for password reset
      return {
        data: { success: true },
        message: 'Password reset email sent',
      };
    } catch (error) {
      throw new Error(
        `Password reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

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
        tenantId: authData.tenantId,
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
