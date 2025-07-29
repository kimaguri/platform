import { api, Header } from 'encore.dev/api';
import { 
  login as authLogin, 
  register as authRegister, 
  refreshToken as authRefreshToken, 
  logout as authLogout, 
  resetPassword as authResetPassword 
} from '../utils/auth-connector';
import type { ApiResponse } from '../utils/service-clients';

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

/**
 * Authentication Endpoints - /api/v1/auth/*
 */

export const login = api(
  { method: 'POST', path: '/api/v1/auth/login', expose: true, auth: false },
  async (
    data: LoginRequest & { tenantId: Header<'X-Tenant-Id'> }
  ): Promise<ApiResponse<AuthResponse>> => {
    try {
      // Use AuthConnector for centralized authentication logic
      const result = await authLogin({
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
  { method: 'POST', path: '/api/v1/auth/register', expose: true, auth: false },
  async (
    data: RegisterRequest & { tenantId: Header<'X-Tenant-Id'> }
  ): Promise<ApiResponse<AuthResponse>> => {
    try {
      // Use AuthConnector for centralized authentication logic
      const result = await authRegister({
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
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const refreshToken = api(
  { method: 'POST', path: '/api/v1/auth/refresh', expose: true, auth: false },
  async (
    data: { refreshToken: string } & { tenantId: Header<'X-Tenant-Id'> }
  ): Promise<ApiResponse<AuthResponse>> => {
    try {
      // Use AuthConnector for centralized authentication logic
      const result = await authRefreshToken({
        tenantId: data.tenantId,
        refreshToken: data.refreshToken,
      });

      return {
        data: result,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const logout = api(
  { method: 'POST', path: '/api/v1/auth/logout', expose: true, auth: false },
  async (
    data: { token?: string } & { tenantId: Header<'X-Tenant-Id'> }
  ): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      // Use AuthConnector for centralized logout logic
      await authLogout({
        tenantId: data.tenantId,
        token: data.token,
      });

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
  { method: 'POST', path: '/api/v1/auth/reset-password', expose: true, auth: false },
  async (data: {
    email: string;
    tenantId: Header<'X-Tenant-Id'>;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      // Use AuthConnector for centralized password reset logic
      await authResetPassword({
        tenantId: data.tenantId,
        email: data.email,
      });

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
