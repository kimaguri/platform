import type { ApiResponse } from '../../lib/types';
import { getAdapterForTenant } from '../../connectors/registry/connector-registry';
import type { Adapter } from '../../connectors/base';

// Import extensible fields functions
import {
  getEntityWithExtensions as getEntityWithExtensionsFromModule,
  getEntitiesWithExtensions as getEntitiesWithExtensionsFromModule,
  createEntityWithExtensions as createEntityWithExtensionsFromModule,
  updateEntityWithExtensions as updateEntityWithExtensionsFromModule,
  parseExtensionFieldValues,
  invalidateFieldDefinitionsCache,
  getFieldDefinitionsCacheStats,
  type EntityWithExtensions,
  type ExtensionFieldsFilter,
  type ExtensionFieldsSorter,
  type ExtensionFieldValue,
} from './src/utils/extensible-fields';

/**
 * Content Management Business Logic
 * Functional approach using connectors for database abstraction
 * Integrates with extensible fields functionality
 * No classes - pure functions only
 */

/**
 * Health check for data processing service
 */
export async function performDataProcessingServiceHealthCheck(): Promise<
  ApiResponse<{ status: string; timestamp: string }>
> {
  try {
    // Basic health check - could be extended to check database connectivity
    return {
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      message: 'Data Processing Service is healthy',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Health check failed',
      message: 'Data Processing Service health check failed',
    };
  }
}

// ===== EXTENSIBLE FIELDS FUNCTIONS =====

/**
 * Get single entity with extensible fields
 */
export async function getEntityRecord(
  tenantId: string,
  entityTable: string,
  entityId: string
): Promise<ApiResponse<EntityWithExtensions>> {
  try {
    const entity = await getEntityWithExtensionsFromModule(tenantId, entityTable, entityId);

    if (!entity) {
      return {
        error: `Entity with id ${entityId} not found in ${entityTable}`,
        message: 'Entity not found',
      };
    }

    return {
      data: entity,
      message: `Retrieved ${entityTable} entity with extensions`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch entity with extensions',
      message: 'Failed to fetch entity with extensions',
    };
  }
}

/**
 * Get list of entities with extensible fields
 */
export async function getEntityList(
  tenantId: string,
  entityTable: string,
  options: {
    limit?: number;
    offset?: number;
    filters?: ExtensionFieldsFilter[];
    sorters?: ExtensionFieldsSorter[];
  } = {}
): Promise<ApiResponse<{ data: EntityWithExtensions[]; total: number }>> {
  try {
    const result = await getEntitiesWithExtensionsFromModule(tenantId, entityTable, options);

    return {
      data: result,
      message: `Retrieved ${result.data.length} ${entityTable} entities with extensions`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch entities with extensions',
      message: 'Failed to fetch entities with extensions',
    };
  }
}

/**
 * Create entity with extensible fields
 */
export async function createEntityRecord(
  tenantId: string,
  entityTable: string,
  entityData: Record<string, any>,
  extensionFields: ExtensionFieldValue
): Promise<ApiResponse<EntityWithExtensions>> {
  try {
    const entity = await createEntityWithExtensionsFromModule(
      tenantId,
      entityTable,
      entityData,
      extensionFields
    );

    return {
      data: entity,
      message: `Created ${entityTable} entity with extensions`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create entity with extensions',
      message: 'Failed to create entity with extensions',
    };
  }
}

/**
 * Update entity with extensible fields
 */
export async function updateEntityRecord(
  tenantId: string,
  entityTable: string,
  entityId: string,
  entityData: Record<string, any>,
  extensionFields?: ExtensionFieldValue
): Promise<ApiResponse<EntityWithExtensions>> {
  try {
    const entity = await updateEntityWithExtensionsFromModule(
      tenantId,
      entityTable,
      entityId,
      entityData,
      extensionFields
    );

    if (!entity) {
      return {
        error: `Entity with id ${entityId} not found in ${entityTable}`,
        message: 'Entity not found',
      };
    }

    return {
      data: entity,
      message: `Updated ${entityTable} entity with extensions`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update entity with extensions',
      message: 'Failed to update entity with extensions',
    };
  }
}

/**
 * Delete entity
 */
export async function deleteEntityRecord(
  tenantId: string,
  entityTable: string,
  entityId: string
): Promise<ApiResponse<boolean>> {
  try {
    // Get adapter for tenant database
    const adapter = await getAdapterForTenant(tenantId, entityTable);

    // Delete the entity
    const success = await adapter.delete(entityId);

    if (!success) {
      return {
        error: `Entity with id ${entityId} not found in ${entityTable}`,
        message: 'Entity not found',
      };
    }

    return {
      data: success,
      message: `Deleted ${entityTable} entity`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete entity',
      message: 'Failed to delete entity',
    };
  }
}

/**
 * Get field definitions for entity (proxy to Tenant Management Service)
 */
export async function getFieldDefinitionsForEntity(
  tenantId: string,
  entityTable: string
): Promise<ApiResponse<any[]>> {
  try {
    // TODO: Replace with actual RPC call to Tenant Management Service
    // const response = await tenantManagementClient.getFieldDefinitions({ tenantId, entityTable });

    console.log(
      `[ContentService] Loading field definitions for ${tenantId}:${entityTable} from Tenant Management Service`
    );

    // Temporary stub - in reality will be RPC call
    const definitions: any[] = [];

    return {
      data: definitions,
      message: `Retrieved field definitions for ${entityTable}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch field definitions',
      message: 'Failed to fetch field definitions',
    };
  }
}

/**
 * Validate extension fields
 */
export async function validateExtensionFields(
  tenantId: string,
  entityTable: string,
  extensionFields: ExtensionFieldValue
): Promise<ApiResponse<{ isValid: boolean; errors: string[] }>> {
  try {
    // Get field definitions from Tenant Management Service
    const definitionsResponse = await getFieldDefinitionsForEntity(tenantId, entityTable);

    if (definitionsResponse.error) {
      return {
        error: definitionsResponse.error,
        message: 'Failed to validate extension fields',
      };
    }

    const fieldDefinitions = definitionsResponse.data || [];

    // Validate using parseExtensionFieldValues (will throw on validation errors)
    try {
      parseExtensionFieldValues(extensionFields, fieldDefinitions);

      return {
        data: { isValid: true, errors: [] },
        message: 'Extension fields are valid',
      };
    } catch (validationError) {
      return {
        data: {
          isValid: false,
          errors: [
            validationError instanceof Error ? validationError.message : 'Validation failed',
          ],
        },
        message: 'Extension fields validation failed',
      };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to validate extension fields',
      message: 'Failed to validate extension fields',
    };
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): ApiResponse<{
  fieldDefinitionsCache: { size: number; entries: string[] };
}> {
  try {
    const fieldDefinitionsCache = getFieldDefinitionsCacheStats();

    return {
      data: { fieldDefinitionsCache },
      message: 'Cache statistics retrieved',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to get cache statistics',
      message: 'Failed to get cache statistics',
    };
  }
}

/**
 * Invalidate cache
 */
export function invalidateCache(tenantId?: string, entityTable?: string): ApiResponse<boolean> {
  try {
    invalidateFieldDefinitionsCache(tenantId, entityTable);

    return {
      data: true,
      message:
        tenantId && entityTable
          ? `Cache invalidated for ${tenantId}:${entityTable}`
          : tenantId
          ? `Cache invalidated for tenant ${tenantId}`
          : 'All cache invalidated',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to invalidate cache',
      message: 'Failed to invalidate cache',
    };
  }
}
