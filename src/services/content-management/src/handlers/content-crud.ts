import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import { ConnectorRegistry } from '../../../../connectors/registry/connector-registry';
import { ResourceResolver } from '../../../../connectors/registry/resource-resolver';
import { getTenantConfigById } from '../../../../shared/tenantConfig';
import { ApiResponse } from '../../../../shared/types';
import {
  ListResponse,
  EntityResponse,
  DeleteResponse,
  toListResponse,
  toEntityResponse,
  toDeleteResponse,
} from '../../../../shared/types/supabase-response';
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

// Extended interface for list entities with pagination
interface ListEntitiesWithPaginationRequest {
  entity: string;
  limit?: Query<number>;
  offset?: Query<number>;
}

// Using universal Supabase response types
// Removed custom interfaces in favor of standardized types

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
  async ({ entity, limit, offset }: ListEntitiesWithPaginationRequest): Promise<ListResponse> => {
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
        count: entities.length,
        message: 'Entities retrieved successfully',
        success: true,
      };
    } catch (error) {
      return {
        count: 0,
        message: error instanceof Error ? error.message : 'Failed to fetch entities',
        success: false,
      };
    }
  }
);

/**
 * Получить одну запись по ID
 */
export const getEntity = api(
  { auth: true, method: 'GET', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id }: GetEntityRequest): Promise<EntityResponse> => {
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
          entityId: undefined,
          message: 'Entity not found',
          success: false,
        };
      }

      return {
        entityId: entities[0]?.id || undefined,
        message: 'Entity retrieved successfully',
        success: true,
      };
    } catch (error) {
      return {
        entityId: undefined,
        message: error instanceof Error ? error.message : 'Failed to fetch entity',
        success: false,
      };
    }
  }
);

/**
 * Создать новую запись
 */
export const createEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity', expose: true },
  async ({ entity, data }: CreateEntityRequest): Promise<EntityResponse> => {
    try {
      const authData = getAuthData() as AuthData;

      const result = await resourceResolver.createResource<ContentEntity>(
        authData.tenantId,
        entity,
        data,
        getTenantConnectorConfig
      );

      return {
        entityId: result?.id || undefined,
        message: 'Entity created successfully',
        success: true,
      };
    } catch (error) {
      return {
        entityId: undefined,
        message: error instanceof Error ? error.message : 'Failed to create entity',
        success: false,
      };
    }
  }
);

/**
 * Обновить запись по ID
 */
export const updateEntity = api(
  { auth: true, method: 'PUT', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id, data }: UpdateEntityRequest): Promise<EntityResponse> => {
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
        entityId: result?.id || undefined,
        message: 'Entity updated successfully',
        success: true,
      };
    } catch (error) {
      return {
        entityId: undefined,
        message: error instanceof Error ? error.message : 'Failed to update entity',
        success: false,
      };
    }
  }
);

/**
 * Удалить запись по ID
 */
export const deleteEntity = api(
  { auth: true, method: 'DELETE', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id }: DeleteEntityRequest): Promise<DeleteResponse> => {
    try {
      const authData = getAuthData() as AuthData;

      await resourceResolver.deleteResource(
        authData.tenantId,
        entity,
        id,
        getTenantConnectorConfig
      );

      return {
        deletedCount: 1,
        message: 'Entity deleted successfully',
        success: true,
      };
    } catch (error) {
      return {
        deletedCount: 0,
        message: error instanceof Error ? error.message : 'Failed to delete entity',
        success: false,
      };
    }
  }
);

/**
 * Upsert (создать или обновить) запись
 */
export const upsertEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity/upsert', expose: true },
  async ({ entity, data, conflictColumns }: UpsertEntityRequest): Promise<EntityResponse> => {
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
        entityId: result?.id || undefined,
        message: 'Entity upserted successfully',
        success: true,
      };
    } catch (error) {
      return {
        entityId: undefined,
        message: error instanceof Error ? error.message : 'Failed to upsert entity',
        success: false,
      };
    }
  }
);
