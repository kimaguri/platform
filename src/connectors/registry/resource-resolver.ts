import type { Adapter, QueryParams } from '../base';
import { getAdapterForTenant } from './connector-registry';

/**
 * Functional Resource Resolver
 * Provides unified interface for resource operations across different adapters
 * No classes - pure functional approach following Encore.ts best practices
 */

/**
 * Query resources from tenant's database
 */
export async function queryResource<T = any>(
  tenantId: string,
  resource: string,
  params?: QueryParams
): Promise<T[]> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.query(params) as Promise<T[]>;
}

/**
 * Get single resource by ID
 */
export async function getResource<T = any>(
  tenantId: string,
  resource: string,
  id: string
): Promise<T | null> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.queryOne(id) as Promise<T | null>;
}

/**
 * Create new resource
 */
export async function createResource<T = any>(
  tenantId: string,
  resource: string,
  data: Omit<T, 'id'>
): Promise<T> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.insert(data) as Promise<T>;
}

/**
 * Update existing resource
 */
export async function updateResource<T = any>(
  tenantId: string,
  resource: string,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.update(id, data) as Promise<T | null>;
}

/**
 * Delete resource
 */
export async function deleteResource(
  tenantId: string,
  resource: string,
  id: string
): Promise<boolean> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.delete(id);
}

/**
 * Count resources with optional filter
 */
export async function countResources(
  tenantId: string,
  resource: string,
  filter?: Record<string, any>
): Promise<number> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.count(filter);
}

/**
 * Batch operations for efficiency
 */
export async function batchCreateResources<T = any>(
  tenantId: string,
  resource: string,
  dataArray: Omit<T, 'id'>[]
): Promise<T[]> {
  const adapter = await getAdapterForTenant(tenantId, resource);

  // Execute inserts in parallel for better performance
  const insertPromises = dataArray.map((data) => adapter.insert(data) as Promise<T>);
  return Promise.all(insertPromises);
}

/**
 * Advanced query with pagination support
 */
export async function queryResourcesPaginated<T = any>(
  tenantId: string,
  resource: string,
  params: {
    filter?: Record<string, any>;
    page?: number;
    pageSize?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    select?: string | string[];
  } = {}
): Promise<{
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  const { filter = {}, page = 1, pageSize = 10, orderBy, select } = params;

  const adapter = await getAdapterForTenant(tenantId, resource);

  // Get total count
  const total = await adapter.count(filter);
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  // Get paginated data
  const data = (await adapter.query({
    filter,
    limit: pageSize,
    offset,
    orderBy,
    select,
  })) as T[];

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Check if resource exists
 */
export async function resourceExists(
  tenantId: string,
  resource: string,
  id: string
): Promise<boolean> {
  const result = await getResource(tenantId, resource, id);
  return result !== null;
}

/**
 * Search resources with text search (if supported by adapter)
 */
export async function searchResources<T = any>(
  tenantId: string,
  resource: string,
  searchParams: {
    query: string;
    fields?: string[];
    filter?: Record<string, any>;
    limit?: number;
  }
): Promise<T[]> {
  const adapter = await getAdapterForTenant(tenantId, resource);

  // For now, implement basic text search using filter
  // TODO: Enhance with full-text search capabilities per adapter
  const { query, fields = [], filter = {}, limit } = searchParams;

  if (fields.length > 0) {
    // Create OR conditions for text search across specified fields
    const searchFilter = {
      ...filter,
      // This is a simplified implementation
      // Real implementation would depend on adapter capabilities
      $or: fields.map((field) => ({
        [field]: { $regex: query, $options: 'i' },
      })),
    };

    return adapter.query({
      filter: searchFilter,
      limit,
    }) as Promise<T[]>;
  } else {
    // Fallback to basic filter
    return adapter.query({
      filter: { ...filter },
      limit,
    }) as Promise<T[]>;
  }
}

/**
 * Helper function to validate tenant access to resource
 */
export async function validateTenantAccess(tenantId: string, resource: string): Promise<boolean> {
  try {
    await getAdapterForTenant(tenantId, resource);
    return true;
  } catch {
    return false;
  }
}
