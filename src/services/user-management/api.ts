import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../../gateway/auth';
import type { ApiResponse } from '../../lib/types';
import type {
  UserProfile,
  UpdateUserRequest,
  UpdateRoleRequest,
  AppBootstrapData,
} from './src/models/user';
import * as UserService from './service';

/**
 * User Management API Endpoints
 * RPC endpoints called internally by API Gateway
 * Functional approach - no classes, only pure functions
 */

/**
 * List users (admin only)
 */
export const listUsers = api(
  { auth: true, method: 'GET', path: '/users/list' },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<UserProfile[]>> => {
    const authData = getAuthData() as AuthData;
    return UserService.getUserList(authData.tenantId, {
      limit: limit || 50,
      offset: offset || 0,
    });
  }
);

/**
 * Get user profile by ID
 */
export const getUserProfile = api(
  { auth: true, method: 'GET', path: '/users/:userId' },
  async ({ userId }: { userId: string }): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;
    return UserService.getUserProfileById(authData.tenantId, userId);
  }
);

/**
 * Get current user's profile
 */
export const getMyProfile = api(
  { auth: true, method: 'GET', path: '/users/me' },
  async (): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;
    return UserService.getUserProfileById(authData.tenantId, authData.userID);
  }
);

/**
 * Update current user's profile
 */
export const updateMyProfile = api(
  { auth: true, method: 'PUT', path: '/users/me' },
  async (updateData: UpdateUserRequest): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;
    return UserService.updateUserProfile(authData.tenantId, authData.userID, updateData);
  }
);

/**
 * Update user role (admin only)
 */
export const updateUserRole = api(
  { auth: true, method: 'PUT', path: '/users/:userId/role' },
  async ({ userId, role, permissions }: UpdateRoleRequest): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;
    return UserService.updateUserRole(authData.tenantId, userId, { role, permissions });
  }
);

/**
 * Deactivate user (admin only)
 */
export const deactivateUser = api(
  { auth: true, method: 'DELETE', path: '/users/:userId' },
  async ({ userId }: { userId: string }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return UserService.deactivateUser(authData.tenantId, userId);
  }
);







/**
 * Get application bootstrap data
 * Loads all essential data needed for app initialization in one request
 */
export const getAppBootstrapData = api(
  { auth: true, method: 'GET', path: '/bootstrap' },
  async (): Promise<ApiResponse<AppBootstrapData>> => {
    const authData = getAuthData() as AuthData;
    return UserService.getAppBootstrapData(authData.tenantId, authData.userID);
  }
);
