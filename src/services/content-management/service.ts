import type { ApiResponse } from '../../lib/types';
import type { ContentEntity } from './src/models/content';
import {
  queryResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  countResources,
  queryResourcesPaginated,
} from '../../connectors/registry/resource-resolver';

/**
 * Content Management Business Logic
 * Functional approach using ResourceResolver
 * No classes - pure functions only
 */

/**
 * Get entity list with pagination
 */
export async function getEntityList(
  tenantId: string,
  entityType: string,
  params: { limit?: number; offset?: number }
): Promise<ApiResponse<Record<string, any>[]>> {
  try {
    const { limit = 100, offset = 0 } = params;

    const entities = await queryResource<ContentEntity>(tenantId, entityType, {
      limit,
      offset,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    });

    return {
      data: entities,
      message: `Retrieved ${entities.length} ${entityType} entities`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch entities',
      message: 'Failed to fetch entities',
    };
  }
}

/**
 * Get single entity by ID
 */
export async function getEntityById(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<ApiResponse<Record<string, any>>> {
  try {
    const entity = await getResource<ContentEntity>(tenantId, entityType, entityId);

    if (!entity) {
      return {
        error: 'Entity not found',
        message: 'Entity not found',
      };
    }

    return {
      data: entity,
      message: 'Entity retrieved successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch entity',
      message: 'Failed to fetch entity',
    };
  }
}

/**
 * Create new entity
 */
export async function createNewEntity(
  tenantId: string,
  entityType: string,
  data: Record<string, any>
): Promise<ApiResponse<Record<string, any>>> {
  try {
    // Add timestamps
    const entityData = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const entity = await createResource<ContentEntity>(tenantId, entityType, entityData);

    if (!entity) {
      return {
        error: 'Failed to create entity',
        message: 'Entity creation failed',
      };
    }

    return {
      data: entity,
      message: 'Entity created successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create entity',
      message: 'Entity creation failed',
    };
  }
}

/**
 * Update existing entity
 */
export async function updateExistingEntity(
  tenantId: string,
  entityType: string,
  entityId: string,
  data: Record<string, any>
): Promise<ApiResponse<Record<string, any>>> {
  try {
    // Add update timestamp
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const entity = await updateResource<ContentEntity>(tenantId, entityType, entityId, updateData);

    if (!entity) {
      return {
        error: 'Failed to update entity',
        message: 'Entity update failed',
      };
    }

    return {
      data: entity,
      message: 'Entity updated successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update entity',
      message: 'Entity update failed',
    };
  }
}

/**
 * Delete entity by ID
 */
export async function deleteExistingEntity(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<ApiResponse<boolean>> {
  try {
    const success = await deleteResource(tenantId, entityType, entityId);

    return {
      data: success,
      message: success ? 'Entity deleted successfully' : 'Entity deletion failed',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete entity',
      message: 'Entity deletion failed',
    };
  }
}

/**
 * Upsert entity (create or update)
 * For now, this is a simple implementation that tries to update first, then create
 * TODO: Implement proper upsert in ResourceResolver
 */
export async function upsertExistingEntity(
  tenantId: string,
  entityType: string,
  data: Record<string, any>,
  conflictColumns?: string[]
): Promise<ApiResponse<Record<string, any>>> {
  try {
    // For now, we'll try to find existing entity by ID or other unique fields
    const uniqueField = conflictColumns?.[0] || 'id';
    const uniqueValue = data[uniqueField];

    if (uniqueValue) {
      // Try to find existing entity
      const existingEntities = await queryResource<ContentEntity>(tenantId, entityType, {
        filter: { [uniqueField]: uniqueValue },
        limit: 1,
      });

      if (existingEntities && existingEntities.length > 0) {
        // Update existing
        const existingId = existingEntities[0]?.id;
        if (existingId) {
          return updateExistingEntity(tenantId, entityType, existingId, data);
        }
      }
    }

    // Create new
    return createNewEntity(tenantId, entityType, data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to upsert entity',
      message: 'Entity upsert failed',
    };
  }
}

/**
 * Get entity count with optional filter
 */
export async function getEntityCount(
  tenantId: string,
  entityType: string,
  filter?: Record<string, any>
): Promise<ApiResponse<number>> {
  try {
    const count = await countResources(tenantId, entityType, filter);

    return {
      data: count,
      message: 'Entity count retrieved successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to count entities',
      message: 'Failed to count entities',
    };
  }
}

/**
 * Search entities with advanced filtering
 */
export async function searchEntities(
  tenantId: string,
  entityType: string,
  params: {
    filter?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }
): Promise<ApiResponse<Record<string, any>[]>> {
  try {
    const { filter, limit = 100, offset = 0, orderBy } = params;

    const entities = await queryResource<ContentEntity>(tenantId, entityType, {
      filter,
      limit,
      offset,
      orderBy: orderBy || [{ field: 'created_at', direction: 'desc' }],
    });

    return {
      data: entities,
      message: `Found ${entities.length} ${entityType} entities`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to search entities',
      message: 'Failed to search entities',
    };
  }
}

/**
 * Get paginated entities with metadata
 */
export async function getPaginatedEntities(
  tenantId: string,
  entityType: string,
  params: {
    limit?: number;
    offset?: number;
    filter?: Record<string, any>;
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }
): Promise<
  ApiResponse<{
    entities: ContentEntity[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }>
> {
  try {
    const { limit = 100, offset = 0, filter, orderBy } = params;

    const [entities, total] = await Promise.all([
      queryResource<ContentEntity>(tenantId, entityType, {
        filter,
        limit,
        offset,
        orderBy: orderBy || [{ field: 'created_at', direction: 'desc' }],
      }),
      countResources(tenantId, entityType, filter),
    ]);

    const hasMore = offset + limit < total;

    return {
      data: {
        entities,
        total,
        limit,
        offset,
        hasMore,
      },
      message: 'Paginated entities retrieved successfully',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch paginated entities',
      message: 'Failed to fetch paginated entities',
    };
  }
}

/**
 * Bulk operations for entities
 */
export async function bulkCreateEntities(
  tenantId: string,
  entityType: string,
  entities: Record<string, any>[]
): Promise<ApiResponse<Record<string, any>[]>> {
  try {
    const timestamp = new Date().toISOString();
    const results: ContentEntity[] = [];

    // Process in batches to avoid overwhelming the database
    for (const entityData of entities) {
      const data = {
        ...entityData,
        created_at: timestamp,
        updated_at: timestamp,
      };

      const entity = await createResource<ContentEntity>(tenantId, entityType, data);
      if (entity) {
        results.push(entity);
      }
    }

    return {
      data: results,
      message: `Successfully created ${results.length} out of ${entities.length} entities`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to bulk create entities',
      message: 'Bulk creation failed',
    };
  }
}
