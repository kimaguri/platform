import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import { ConnectorRegistry } from '../../../../connectors/registry/connector-registry';
import { ResourceResolver } from '../../../../connectors/registry/resource-resolver';
import { getTenantConfigById } from '../../../../shared/tenantConfig';
import { ApiResponse } from '../../../../shared/types';
import type { AuthData } from '../../../../shared/middleware/auth/auth-handler';
import type {
  ListEntitiesRequest,
  GetEntityRequest,
  CreateEntityRequest,
  UpdateEntityRequest,
  UpsertEntityRequest,
  DeleteEntityRequest,
  ContentEntity,
} from '../models/content';

// Initialize connector system
const connectorRegistry = new ConnectorRegistry();
const resourceResolver = new ResourceResolver(connectorRegistry);

// Helper function to get tenant config for connectors
async function getTenantConnectorConfig(tenantId: string) {
  const tenantConfig = await getTenantConfigById(tenantId);
  return {
    connectorType: 'supabase',
    config: {
      url: tenantConfig.SUPABASE_URL,
      key: tenantConfig.ANON_KEY,
    },
  };
}

/**
 * Получить список записей из указанной таблицы
 * Использует connector system вместо прямого Supabase
 */
export const listEntities = api(
  { auth: true, method: 'GET', path: '/entities/:entity', expose: true },
  async ({
    entity,
    limit,
    offset,
  }: ListEntitiesRequest & { limit?: Query<number>; offset?: Query<number> }): Promise<
    ApiResponse<ContentEntity[]>
  > => {
    try {
      const authData = getAuthData() as AuthData;

      const entities = await resourceResolver.getResource<ContentEntity>(
        authData.tenantId,
        entity,
        {
          limit: limit || 100,
          offset: offset || 0,
        },
        getTenantConnectorConfig
      );

      return {
        data: entities,
        message: 'Entities retrieved successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch entities',
        message: 'Failed to fetch entities',
      };
    }
  }
);

/**
 * Получить одну запись по ID
 */
export const getEntity = api(
  { auth: true, method: 'GET', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id }: GetEntityRequest): Promise<ApiResponse<ContentEntity>> => {
    try {
      const authData = getAuthData() as AuthData;

      const entities = await resourceResolver.getResource<ContentEntity>(
        authData.tenantId,
        entity,
        {
          filter: { id },
          limit: 1,
        },
        getTenantConnectorConfig
      );

      if (!entities || entities.length === 0) {
        return {
          error: 'Entity not found',
          message: 'Entity not found',
        };
      }

      return {
        data: entities[0],
        message: 'Entity retrieved successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch entity',
        message: 'Failed to fetch entity',
      };
    }
  }
);

/**
 * Создать новую запись
 */
export const createEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity', expose: true },
  async ({ entity, data }: CreateEntityRequest): Promise<ApiResponse<ContentEntity>> => {
    try {
      const authData = getAuthData() as AuthData;

      const result = await resourceResolver.createResource<ContentEntity>(
        authData.tenantId,
        entity,
        data,
        getTenantConnectorConfig
      );

      return {
        data: result,
        message: 'Entity created successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to create entity',
        message: 'Failed to create entity',
      };
    }
  }
);

/**
 * Обновить запись по ID
 */
export const updateEntity = api(
  { auth: true, method: 'PUT', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id, data }: UpdateEntityRequest): Promise<ApiResponse<ContentEntity>> => {
    try {
      const authData = getAuthData() as AuthData;

      const result = await resourceResolver.updateResource<ContentEntity>(
        authData.tenantId,
        entity,
        id,
        data,
        getTenantConnectorConfig
      );

      return {
        data: result,
        message: 'Entity updated successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to update entity',
        message: 'Failed to update entity',
      };
    }
  }
);

/**
 * Удалить запись по ID
 */
export const deleteEntity = api(
  { auth: true, method: 'DELETE', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id }: DeleteEntityRequest): Promise<ApiResponse<null>> => {
    try {
      const authData = getAuthData() as AuthData;

      await resourceResolver.deleteResource(
        authData.tenantId,
        entity,
        id,
        getTenantConnectorConfig
      );

      return {
        data: null,
        message: 'Entity deleted successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to delete entity',
        message: 'Failed to delete entity',
      };
    }
  }
);

/**
 * Upsert (создать или обновить) запись
 */
export const upsertEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity/upsert', expose: true },
  async ({
    entity,
    data,
    conflictColumns,
  }: UpsertEntityRequest): Promise<ApiResponse<ContentEntity>> => {
    try {
      const authData = getAuthData() as AuthData;

      const result = await resourceResolver.upsertResource<ContentEntity>(
        authData.tenantId,
        entity,
        data,
        conflictColumns,
        getTenantConnectorConfig
      );

      return {
        data: result,
        message: 'Entity upserted successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to upsert entity',
        message: 'Failed to upsert entity',
      };
    }
  }
);
