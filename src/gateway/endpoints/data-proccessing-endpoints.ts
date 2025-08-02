import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { dataProcessingClient, type ApiResponse } from '../utils/service-clients';

// Request/Response interfaces
interface ContentItem {
  id: string;
  title: string;
  slug?: string;
  content: any; // JSON content
  status: 'draft' | 'published' | 'archived';
  type: string;
  metadata: Record<string, any>;
  authorId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Типы для унифицированной структуры данных (совпадают с data-processing)
type ExtensionFieldValue = Record<string, any>;

type Payload = {
  baseFields: Record<string, any>;
  extensions: ExtensionFieldValue;
};

interface CreateEntityRequest {
  entity: string;
  entityData: Payload; // Изменено с data на entityData типа Payload
}

interface UpdateEntityRequest {
  id: string;
  entity: string;
  entityData: Payload; // Изменено с data на entityData типа Payload
}

// Типы для search endpoint с фильтрацией через body
interface ExtensionFieldsFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'not_in';
  value: unknown;
}

interface ExtensionFieldsSorter {
  field: string;
  direction: 'asc' | 'desc';
}

interface EntitySearchRequest {
  filters?: ExtensionFieldsFilter[];
  select?: string;
  pagination?: {
    page?: number;
    limit?: number;
    offset?: number;
  };
  sort?: ExtensionFieldsSorter[];
  meta?: {
    select?: string;
    [key: string]: any;
  };
}

/**
 * Data Processing Endpoints - /api/v1/data/*
 */

export const createEntityRecord = api(
  { method: 'POST', path: '/api/v1/entity/:entity', expose: true, auth: true },
  async (data: CreateEntityRequest): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    // // Check if user has content creation permissions
    // if (!authData.permissions?.includes('content:write') && authData.role !== 'admin') {
    //   throw new Error('Insufficient permissions to create content');
    // }

    try {
      // Proxy to data-processing service
      const result = await dataProcessingClient.createEntityRecord({
        entity: data.entity,
        data: data.entityData, // Используем entityData вместо data
      });

      return {
        data: result,
        message: 'Content created successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to create content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const getEntityRecordById = api(
  { method: 'GET', path: '/api/v1/entity/:entity/:id', expose: true, auth: true },
  async ({ entity, id }: { entity: string; id: string }): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    try {
      // Proxy to data-processing service
      const result = await dataProcessingClient.getEntityRecord({
        entity,
        id,
      });

      return {
        data: result,
        message: 'Content retrieved',
      };
    } catch (error) {
      throw new Error(
        `Failed to get content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const updateEntityRecord = api(
  { method: 'PUT', path: '/api/v1/entity/:entity/:id', expose: true, auth: true },
  async (data: UpdateEntityRequest & { id: string }): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    // // Check if user has content write permissions
    // if (!authData.permissions?.includes('content:write') && authData.role !== 'admin') {
    //   throw new Error('Insufficient permissions to update content');
    // }

    try {
      // Proxy to data-processing service
      const result = await dataProcessingClient.updateEntityRecord({
        entity: data.entity,
        id: data.id,
        data: data.entityData, // Используем entityData вместо data
      });

      return {
        data: result,
        message: 'Content updated successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to update content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const deleteEntityRecord = api(
  { method: 'DELETE', path: '/api/v1/entity/:entity/:id', expose: true, auth: true },
  async ({
    entity,
    id,
  }: {
    entity: string;
    id: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    const authData = getAuthData() as AuthData;

    // // Check if user has content delete permissions
    // if (!authData.permissions?.includes('content:delete') && authData.role !== 'admin') {
    //   throw new Error('Insufficient permissions to delete content');
    // }

    try {
      // Proxy to data-processing service
      console.log('[Gateway DELETE] Calling data-processing with:', { entityTable: entity, recordId: id });
      
      const result = await dataProcessingClient.deleteEntityRecord({
        entityTable: entity,
        recordId: id,
      });
      
      console.log('[Gateway DELETE] Result from data-processing:', result);
      
      // Проверяем, есть ли ошибка в ответе от data-processing
      if (result.error) {
        throw new Error(result.error);
      }

      return {
        data: { success: true },
        message: 'Content deleted successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to delete content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const listEntityRecords = api(
  { method: 'GET', path: '/api/v1/entity/:entity', expose: true, auth: true },
  async ({
    limit,
    offset,
    page,
    entity,
    status,
    select,
    filters,
    sorters,
    meta,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
    page?: Query<number>;
    entity: string;
    status?: Query<'draft' | 'published' | 'archived'>;
    select?: Query<string>;
    filters?: Query<string>;
    sorters?: Query<string>;
    meta?: Query<string>;
  }): Promise<ApiResponse<ContentItem[]>> => {
    const authData = getAuthData() as AuthData;

    // // Check if user has content read permissions
    // if (!authData.permissions?.includes('content:read') && authData.role !== 'admin') {
    //   throw new Error('Insufficient permissions to list content');
    // }

    try {
      // Calculate offset from page if provided (Refine compatibility)
      const finalLimit = limit || 50;
      let finalOffset = offset || 0;
      
      // If page is provided, convert it to offset (page is 1-based)
      if (page && page > 0) {
        finalOffset = (page - 1) * finalLimit;
      }

      // Proxy to data-processing service
      const result = await dataProcessingClient.listEntityRecords({
        entity,
        limit: finalLimit,
        offset: finalOffset,
        select,
        filters,
        sorters,
        meta,
      });

      // Check if the result contains an error
      if ('error' in result && result.error) {
        throw new Error(result.error);
      }

      // Extract data from the nested structure returned by data-processing service
      const responseData = result.data || result;
      const entities = responseData.data || [];
      const total = responseData.total || 0;
      const pagination = responseData.pagination || {};

      return {
        data: entities,
        message: result.message || 'Entities retrieved successfully',
        meta: {
          total: total,
          limit: finalLimit,
          page: Math.floor(finalOffset / finalLimit) + 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to list entities: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Search entities with complex filters via POST body
 * Best practice approach for complex queries with filters, sorting, and pagination
 */
export const searchEntityRecords = api(
  { method: 'POST', path: '/api/v1/entity/:entity/search', expose: true, auth: true },
  async ({
    entity,
    filters = [],
    select,
    pagination = {},
    sort = [],
    meta,
  }: {
    entity: string;
    filters?: ExtensionFieldsFilter[];
    select?: string;
    pagination?: {
      page?: number;
      limit?: number;
      offset?: number;
    };
    sort?: ExtensionFieldsSorter[];
    meta?: {
      select?: string;
    };
  }): Promise<ApiResponse<ContentItem[]>> => {
    const authData = getAuthData() as AuthData;
    
    // Debug logging for CORS investigation
    console.log('searchEntityRecords called with params:', {
      entity,
      filters,
      select,
      pagination,
      sort,
      meta,
      authData: authData ? 'Present' : 'Missing'
    });

    try {
      // Extract pagination parameters
      const { page, limit, offset } = pagination;
      const finalLimit = limit || 50;
      let finalOffset = offset || 0;
      
      // If page is provided, convert it to offset (page is 1-based)
      if (page && page > 0) {
        finalOffset = (page - 1) * finalLimit;
      }

      // Convert sort array to sorters format expected by data-processing
      const sorters = sort.map(sorter => ({
        field: sorter.field,
        order: sorter.direction
      }));

      // Proxy to data-processing service
      const result = await dataProcessingClient.listEntityRecords({
        entity,
        limit: finalLimit,
        offset: finalOffset,
        select,
        filters: filters.length > 0 ? JSON.stringify(filters) : undefined,
        sorters: sorters.length > 0 ? JSON.stringify(sorters) : undefined,
        meta: meta ? JSON.stringify(meta) : undefined,
      });

      // Check if the result contains an error
      if ('error' in result && result.error) {
        throw new Error(result.error);
      }

      // Extract data from the nested structure returned by data-processing service
      const responseData = result.data || result;
      const entities = responseData.data || [];
      const total = responseData.total || 0;
      const pagination_result = responseData.pagination || {};

      return {
        data: entities,
        message: result.message || `Found ${entities.length} ${entity} entities`,
      };
    } catch (error) {
      throw new Error(
        `Failed to search entities: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
