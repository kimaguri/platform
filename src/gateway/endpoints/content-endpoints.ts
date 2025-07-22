import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { contentManagementClient, type ApiResponse } from '../utils/service-clients';

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

interface CreateContentRequest {
  title: string;
  slug?: string;
  content: any;
  type: string;
  status?: 'draft' | 'published';
  metadata?: Record<string, any>;
}

interface UpdateContentRequest {
  title?: string;
  slug?: string;
  content?: any;
  status?: 'draft' | 'published' | 'archived';
  metadata?: Record<string, any>;
}

/**
 * Content Management Endpoints - /api/v1/content/*
 */

export const createContent = api(
  { method: 'POST', path: '/api/v1/content', expose: true, auth: true },
  async (data: CreateContentRequest): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has content creation permissions
    if (!authData.permissions?.includes('content:write') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to create content');
    }

    try {
      // Proxy to content-management service
      const result = await contentManagementClient.createContent({
        tenantId: authData.tenantId,
        authorId: authData.userID,
        ...data,
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

export const getContentById = api(
  { method: 'GET', path: '/api/v1/content/:id', expose: true, auth: true },
  async ({ id }: { id: string }): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    try {
      // Proxy to content-management service
      const result = await contentManagementClient.getContent({
        tenantId: authData.tenantId,
        contentId: id,
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

export const updateContent = api(
  { method: 'PUT', path: '/api/v1/content/:id', expose: true, auth: true },
  async ({
    id,
    ...data
  }: UpdateContentRequest & { id: string }): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has content write permissions
    if (!authData.permissions?.includes('content:write') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to update content');
    }

    try {
      // Proxy to content-management service
      const result = await contentManagementClient.updateContent({
        tenantId: authData.tenantId,
        contentId: id,
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

export const deleteContent = api(
  { method: 'DELETE', path: '/api/v1/content/:id', expose: true, auth: true },
  async ({ id }: { id: string }): Promise<ApiResponse<{ success: boolean }>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has content delete permissions
    if (!authData.permissions?.includes('content:delete') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to delete content');
    }

    try {
      // Proxy to content-management service
      await contentManagementClient.deleteContent({
        tenantId: authData.tenantId,
        contentId: id,
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

export const listContent = api(
  { method: 'GET', path: '/api/v1/content', expose: true, auth: true },
  async ({
    limit,
    offset,
    type,
    status,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
    type?: Query<string>;
    status?: Query<'draft' | 'published' | 'archived'>;
  }): Promise<ApiResponse<ContentItem[]>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has content read permissions
    if (!authData.permissions?.includes('content:read') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to list content');
    }

    try {
      // Proxy to content-management service
      const result = await contentManagementClient.listContent({
        tenantId: authData.tenantId,
        limit: limit || 50,
        offset: offset || 0,
        type,
        status,
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

export const publishContent = api(
  { method: 'POST', path: '/api/v1/content/:id/publish', expose: true, auth: true },
  async ({ id }: { id: string }): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has content publish permissions
    if (!authData.permissions?.includes('content:publish') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to publish content');
    }

    try {
      // Proxy to content-management service
      const result = await contentManagementClient.updateContent({
        tenantId: authData.tenantId,
        contentId: id,
        status: 'published',
        publishedAt: new Date().toISOString(),
      });

      return {
        data: result,
        message: 'Content published successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to publish content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

export const archiveContent = api(
  { method: 'POST', path: '/api/v1/content/:id/archive', expose: true, auth: true },
  async ({ id }: { id: string }): Promise<ApiResponse<ContentItem>> => {
    const authData = getAuthData() as AuthData;

    // Check if user has content write permissions
    if (!authData.permissions?.includes('content:write') && authData.role !== 'admin') {
      throw new Error('Insufficient permissions to archive content');
    }

    try {
      // Proxy to content-management service
      const result = await contentManagementClient.updateContent({
        tenantId: authData.tenantId,
        contentId: id,
        status: 'archived',
      });

      return {
        data: result,
        message: 'Content archived successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to archive content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
