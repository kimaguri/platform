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

interface CreateEntityRequest {
  entity: string;
  data: Record<string, any>;
}

interface UpdateEntityRequest {
  id: string;
  entity: string;
  data: Record<string, any>;
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
        data: data.data,
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
  async ({
    entity,
    id,
    ...data
  }: UpdateEntityRequest & { id: string }): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    // // Check if user has content write permissions
    // if (!authData.permissions?.includes('content:write') && authData.role !== 'admin') {
    //   throw new Error('Insufficient permissions to update content');
    // }

    try {
      // Proxy to data-processing service
      const result = await dataProcessingClient.updateEntityRecord({
        entity,
        id,
        ...data,
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
      await dataProcessingClient.deleteEntityRecord({
        entity,
        id,
      });

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
    entity,
    status,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
    entity: string;
    status?: Query<'draft' | 'published' | 'archived'>;
  }): Promise<ApiResponse<ContentItem[]>> => {
    const authData = getAuthData() as AuthData;

    // // Check if user has content read permissions
    // if (!authData.permissions?.includes('content:read') && authData.role !== 'admin') {
    //   throw new Error('Insufficient permissions to list content');
    // }

    try {
      // Proxy to data-processing service
      const result = await dataProcessingClient.listEntityRecords({
        entity,
        limit: limit || 50,
        offset: offset || 0,
      });

      return {
        data: (result as any)?.content || [],
        message: 'Content retrieved',
        meta: {
          total: (result as any)?.total || 0,
          limit: limit || 50,
          page: Math.floor((offset || 0) / (limit || 50)) + 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to list content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
