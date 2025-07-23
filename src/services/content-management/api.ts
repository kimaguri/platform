import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../../gateway/auth';
import type { ApiResponse } from '../../lib/types';
import * as ContentService from './service';

/**
 * Content Management API Endpoints
 * RPC endpoints called internally by API Gateway
 * Functional approach - no classes, only pure functions
 */

/**
 * List entities with pagination
 */
export const listEntities = api(
  { auth: true, method: 'GET', path: '/entities/:entity' },
  async ({
    entity,
    limit,
    offset,
  }: {
    entity: string;
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<Record<string, any>[]>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.getEntityList(authData.tenantId, entity, {
      limit: limit || 100,
      offset: offset || 0,
    });
  }
);

/**
 * Get single entity by ID
 */
export const getEntity = api(
  { auth: true, method: 'GET', path: '/entities/:entity/:id' },
  async ({
    entity,
    id,
  }: {
    entity: string;
    id: string;
  }): Promise<ApiResponse<Record<string, any>>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.getEntityById(authData.tenantId, entity, id);
  }
);

/**
 * Create new entity
 */
export const createEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity' },
  async ({
    entity,
    data,
  }: {
    entity: string;
    data: Record<string, any>;
  }): Promise<ApiResponse<Record<string, any>>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.createNewEntity(authData.tenantId, entity, data);
  }
);

/**
 * Update existing entity
 */
export const updateEntity = api(
  { auth: true, method: 'PUT', path: '/entities/:entity/:id' },
  async ({
    entity,
    id,
    data,
  }: {
    entity: string;
    id: string;
    data: Record<string, any>;
  }): Promise<ApiResponse<Record<string, any>>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.updateExistingEntity(authData.tenantId, entity, id, data);
  }
);

/**
 * Delete entity by ID
 */
export const deleteEntity = api(
  { auth: true, method: 'DELETE', path: '/entities/:entity/:id' },
  async ({ entity, id }: { entity: string; id: string }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.deleteExistingEntity(authData.tenantId, entity, id);
  }
);

/**
 * Upsert entity (create or update)
 */
export const upsertEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity/upsert' },
  async ({
    entity,
    data,
    conflictColumns,
  }: {
    entity: string;
    data: Record<string, any>;
    conflictColumns?: string[];
  }): Promise<ApiResponse<Record<string, any>>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.upsertExistingEntity(authData.tenantId, entity, data, conflictColumns);
  }
);

/**
 * Count entities in table
 */
export const countEntities = api(
  { auth: true, method: 'GET', path: '/entities/:entity/count' },
  async ({
    entity,
    filter,
  }: {
    entity: string;
    filter?: Query<string>; // JSON string filter
  }): Promise<ApiResponse<number>> => {
    const authData = getAuthData() as AuthData;
    const parsedFilter = filter ? JSON.parse(filter) : undefined;
    return ContentService.getEntityCount(authData.tenantId, entity, parsedFilter);
  }
);

/**
 * Search entities with filter
 */
export const searchEntities = api(
  { auth: true, method: 'POST', path: '/entities/:entity/search' },
  async ({
    entity,
    filter,
    limit,
    offset,
    orderBy,
  }: {
    entity: string;
    filter?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }): Promise<ApiResponse<Record<string, any>[]>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.searchEntities(authData.tenantId, entity, {
      filter,
      limit: limit || 100,
      offset: offset || 0,
      orderBy,
    });
  }
);
