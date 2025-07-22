import { api, Query } from 'encore.dev/api';
import { ApiResponse } from '../../shared/types';
import type { ServiceRoute, RouteMatch } from '../src/models/gateway';

// Content management service routes configuration
export const contentRoutes: ServiceRoute = {
  serviceName: 'content-management',
  basePath: '/api/v1/entities',
  version: 'v1',
};

/**
 * Entity CRUD routes
 */

// List entities
export const listEntities = api(
  { auth: true, method: 'GET', path: '/api/v1/entities/:entity', expose: true },
  async ({
    entity,
    limit,
    offset,
  }: {
    entity: string;
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<any>> => {
    return {
      message: `Entity listing for ${entity} handled by content-management service`,
      data: null,
    };
  }
);

// Get entity by ID
export const getEntity = api(
  { auth: true, method: 'GET', path: '/api/v1/entities/:entity/:id', expose: true },
  async ({ entity, id }: { entity: string; id: string }): Promise<ApiResponse<any>> => {
    return {
      message: `Entity ${id} from ${entity} handled by content-management service`,
      data: null,
    };
  }
);

// Create entity
export const createEntity = api(
  { auth: true, method: 'POST', path: '/api/v1/entities/:entity', expose: true },
  async ({ entity, data }: { entity: string; data: any }): Promise<ApiResponse<any>> => {
    return {
      message: `Entity creation in ${entity} handled by content-management service`,
      data: null,
    };
  }
);

// Update entity
export const updateEntity = api(
  { auth: true, method: 'PUT', path: '/api/v1/entities/:entity/:id', expose: true },
  async ({
    entity,
    id,
    data,
  }: {
    entity: string;
    id: string;
    data: any;
  }): Promise<ApiResponse<any>> => {
    return {
      message: `Entity ${id} update in ${entity} handled by content-management service`,
      data: null,
    };
  }
);

// Delete entity
export const deleteEntity = api(
  { auth: true, method: 'DELETE', path: '/api/v1/entities/:entity/:id', expose: true },
  async ({ entity, id }: { entity: string; id: string }): Promise<ApiResponse<any>> => {
    return {
      message: `Entity ${id} deletion from ${entity} handled by content-management service`,
      data: null,
    };
  }
);

// Upsert entity
export const upsertEntity = api(
  { auth: true, method: 'POST', path: '/api/v1/entities/:entity/upsert', expose: true },
  async ({
    entity,
    data,
    conflictColumns,
  }: {
    entity: string;
    data: any;
    conflictColumns?: string[];
  }): Promise<ApiResponse<any>> => {
    return {
      message: `Entity upsert in ${entity} handled by content-management service`,
      data: null,
    };
  }
);

/**
 * Route matching function for content management
 */
export function matchContentRoute(path: string, method: string): RouteMatch | null {
  const basePath = contentRoutes.basePath;

  if (!path.startsWith(basePath)) {
    return null;
  }

  const relativePath = path.substring(basePath.length);
  const pathParams: Record<string, string> = {};

  // Match specific patterns
  const patterns = [
    {
      pattern: /^\/([^\/]+)$/,
      targetPath: '/entities/$1',
      params: ['entity'],
    }, // /api/v1/entities/:entity
    {
      pattern: /^\/([^\/]+)\/([^\/]+)$/,
      targetPath: '/entities/$1/$2',
      params: ['entity', 'id'],
    }, // /api/v1/entities/:entity/:id
    {
      pattern: /^\/([^\/]+)\/upsert$/,
      targetPath: '/entities/$1/upsert',
      params: ['entity'],
    }, // /api/v1/entities/:entity/upsert
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
        service: contentRoutes,
        targetPath: resolvedPath,
        pathParams,
      };
    }
  }

  return null;
}
