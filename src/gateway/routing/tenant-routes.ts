import { api } from 'encore.dev/api';
import { ApiResponse } from '../../shared/types';
import type { ServiceRoute, RouteMatch } from '../src/models/gateway';

// Tenant management service routes configuration
export const tenantRoutes: ServiceRoute = {
  serviceName: 'tenant-management',
  basePath: '/api/v1/tenants',
  version: 'v1',
  healthEndpoint: '/tenants/health',
};

/**
 * Proxy routes for tenant management
 * These routes forward requests to the tenant-management service
 */

// List tenants
export const listTenants = api(
  { method: 'GET', path: '/api/v1/tenants', expose: true },
  async (): Promise<ApiResponse<any>> => {
    // This will be handled by the proxy system
    // For now, return a placeholder that indicates routing
    return {
      message: 'Route handled by tenant-management service',
      data: null,
    };
  }
);

// Get tenant by ID
export const getTenant = api(
  { method: 'GET', path: '/api/v1/tenants/:tenantId', expose: true },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<any>> => {
    return {
      message: `Route for tenant ${tenantId} handled by tenant-management service`,
      data: null,
    };
  }
);

// Create tenant
export const createTenant = api(
  { method: 'POST', path: '/api/v1/tenants', expose: true },
  async (data: any): Promise<ApiResponse<any>> => {
    return {
      message: 'Tenant creation handled by tenant-management service',
      data: null,
    };
  }
);

// Update tenant
export const updateTenant = api(
  { method: 'PUT', path: '/api/v1/tenants/:tenantId', expose: true },
  async ({ tenantId, ...data }: { tenantId: string } & any): Promise<ApiResponse<any>> => {
    return {
      message: `Tenant ${tenantId} update handled by tenant-management service`,
      data: null,
    };
  }
);

// Delete tenant
export const deleteTenant = api(
  { method: 'DELETE', path: '/api/v1/tenants/:tenantId', expose: true },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<any>> => {
    return {
      message: `Tenant ${tenantId} deletion handled by tenant-management service`,
      data: null,
    };
  }
);

// Create tenant config
export const createTenantConfig = api(
  { method: 'POST', path: '/api/v1/tenants/:tenantId/config', expose: true },
  async ({ tenantId, ...data }: { tenantId: string } & any): Promise<ApiResponse<any>> => {
    return {
      message: `Config creation for tenant ${tenantId} handled by tenant-management service`,
      data: null,
    };
  }
);

/**
 * Route matching function for tenant management
 */
export function matchTenantRoute(path: string, method: string): RouteMatch | null {
  const basePath = tenantRoutes.basePath;

  if (!path.startsWith(basePath)) {
    return null;
  }

  const relativePath = path.substring(basePath.length);
  const pathParams: Record<string, string> = {};

  // Match specific patterns
  const patterns = [
    { pattern: /^$/, targetPath: '/tenants' }, // /api/v1/tenants
    { pattern: /^\/([^\/]+)$/, targetPath: '/tenants/$1', params: ['tenantId'] }, // /api/v1/tenants/:id
    { pattern: /^\/([^\/]+)\/config$/, targetPath: '/tenants/$1/config', params: ['tenantId'] }, // /api/v1/tenants/:id/config
    { pattern: /^\/health$/, targetPath: '/tenants/health' }, // /api/v1/tenants/health
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
        service: tenantRoutes,
        targetPath: resolvedPath,
        pathParams,
      };
    }
  }

  return null;
}
