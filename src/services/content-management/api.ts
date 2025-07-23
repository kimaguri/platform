import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../../gateway/auth';
import type { ApiResponse } from '../../lib/types';
import * as ContentService from './service';

// Import types for extensible fields
import type {
  EntityWithExtensions,
  ExtensionFieldsFilter,
  ExtensionFieldsSorter,
  ExtensionFieldValue,
} from './src/extensible-fields';

// ===== ENCORE-COMPATIBLE TYPES =====

/**
 * Base fields that all entities have
 */
export interface BaseFields {
  id: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  type?: string;
}

/**
 * Raw map for unknown additional fields
 */
export type RawMap = Record<string, unknown>;

/**
 * Encore-compatible payload type for entities with extensions
 * Uses __raw to capture unknown fields, avoiding index signature issues
 */
export type Payload<TAdditional extends RawMap = RawMap> = BaseFields & {
  extensions: ExtensionFieldValue;
  __raw?: TAdditional;
};

// ===== CONVERTER FUNCTIONS =====

/**
 * Convert EntityWithExtensions to Encore-compatible Payload
 */
export function toPayload(entity: EntityWithExtensions): Payload {
  const { id, created_at, updated_at, name, title, description, status, type, extensions, ...raw } =
    entity as any;

  return {
    id,
    created_at,
    updated_at,
    name,
    title,
    description,
    status,
    type,
    extensions,
    __raw: Object.keys(raw).length > 0 ? raw : undefined,
  };
}

/**
 * Convert Payload back to EntityWithExtensions for internal use
 */
export function fromPayload(payload: Payload): EntityWithExtensions {
  const { __raw, ...baseFields } = payload;

  return {
    ...baseFields,
    ...(__raw || {}),
  } as EntityWithExtensions;
}

/**
 * Content Management API Endpoints
 * Universal RPC endpoints for entities with extensible fields
 * Functional approach - no classes, only pure functions
 */

/**
 * Health check for content management service
 */
export const healthCheck = api(
  { auth: false, method: 'GET', path: '/content/health' },
  async (): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
    return ContentService.performHealthCheck();
  }
);

// ===== EXTENSIBLE FIELDS ENDPOINTS =====

/**
 * Универсальный эндпоинт для получения сущности с расширяемыми полями
 * Поддерживает все сущности: users, leads, clients, projects, activities, employee
 */
export const getEntityWithExtensions = api(
  { auth: true, method: 'GET', path: '/content/:entityTable/:entityId' },
  async ({
    entityTable,
    entityId,
  }: {
    entityTable: string;
    entityId: string;
  }): Promise<ApiResponse<Payload>> => {
    const authData = getAuthData() as AuthData;
    const result = await ContentService.getEntityWithExtensions(
      authData.tenantId,
      entityTable,
      entityId
    );

    if (result.error) {
      return result as ApiResponse<Payload>;
    }

    return {
      data: toPayload(result.data!),
      message: result.message,
    };
  }
);

/**
 * Универсальный эндпоинт для получения списка сущностей с расширяемыми полями
 * Поддерживает пагинацию, фильтрацию и сортировку по базовым и расширяемым полям
 */
export const getEntitiesWithExtensions = api(
  { auth: true, method: 'GET', path: '/content/:entityTable' },
  async ({
    entityTable,
    limit,
    offset,
    filters,
    sorters,
  }: {
    entityTable: string;
    limit?: Query<number>;
    offset?: Query<number>;
    filters?: Query<string>; // JSON string with ExtensionFieldsFilter[]
    sorters?: Query<string>; // JSON string with ExtensionFieldsSorter[]
  }): Promise<
    ApiResponse<{
      data: Payload[];
      total: number;
      pagination: { limit: number; offset: number; hasMore: boolean };
    }>
  > => {
    const authData = getAuthData() as AuthData;

    // Парсим фильтры и сортировку из JSON строк
    let parsedFilters: ExtensionFieldsFilter[] = [];
    let parsedSorters: ExtensionFieldsSorter[] = [];

    try {
      if (filters) {
        parsedFilters = JSON.parse(filters);
      }
      if (sorters) {
        parsedSorters = JSON.parse(sorters);
      }
    } catch (error) {
      return {
        error: 'Invalid filters or sorters format. Expected JSON string.',
        message: 'Invalid query parameters',
      };
    }

    const result = await ContentService.getEntitiesWithExtensions(authData.tenantId, entityTable, {
      limit: limit || 50,
      offset: offset || 0,
      filters: parsedFilters,
      sorters: parsedSorters,
    });

    if (result.error) {
      return result as unknown as ApiResponse<{
        data: Payload[];
        total: number;
        pagination: { limit: number; offset: number; hasMore: boolean };
      }>;
    }

    // Добавляем информацию о пагинации
    const pagination = {
      limit: limit || 50,
      offset: offset || 0,
      hasMore: (offset || 0) + (limit || 50) < result.data!.total,
    };

    return {
      data: {
        data: result.data!.data.map(toPayload),
        total: result.data!.total,
        pagination,
      },
      message: `Retrieved ${result.data!.data.length} ${entityTable} entities with extensions`,
    };
  }
);

/**
 * Создание сущности с расширяемыми полями
 */
export const createEntityWithExtensions = api(
  { auth: true, method: 'POST', path: '/content/:entityTable' },
  async ({
    entityTable,
    entityData,
    extensionFields,
  }: {
    entityTable: string;
    entityData: Payload;
    extensionFields?: ExtensionFieldValue;
  }): Promise<ApiResponse<Payload>> => {
    const authData = getAuthData() as AuthData;

    // Convert Payload back to internal format
    const internalEntityData = fromPayload(entityData);

    const result = await ContentService.createEntityWithExtensions(
      authData.tenantId,
      entityTable,
      internalEntityData,
      extensionFields || {}
    );

    if (result.error) {
      return result as ApiResponse<Payload>;
    }

    return {
      data: toPayload(result.data!),
      message: result.message,
    };
  }
);

/**
 * Обновление сущности с расширяемыми полями
 */
export const updateEntityWithExtensions = api(
  { auth: true, method: 'PUT', path: '/content/:entityTable/:entityId' },
  async ({
    entityTable,
    entityId,
    entityData,
    extensionFields,
  }: {
    entityTable: string;
    entityId: string;
    entityData?: Payload;
    extensionFields?: ExtensionFieldValue;
  }): Promise<ApiResponse<Payload>> => {
    const authData = getAuthData() as AuthData;

    // Convert Payload back to internal format if provided
    const internalEntityData = entityData ? fromPayload(entityData) : {};

    const result = await ContentService.updateEntityWithExtensions(
      authData.tenantId,
      entityTable,
      entityId,
      internalEntityData,
      extensionFields
    );

    if (result.error) {
      return result as ApiResponse<Payload>;
    }

    return {
      data: toPayload(result.data!),
      message: result.message,
    };
  }
);

/**
 * Удаление сущности
 */
export const deleteEntity = api(
  { auth: true, method: 'DELETE', path: '/content/:entityTable/:entityId' },
  async ({
    entityTable,
    entityId,
  }: {
    entityTable: string;
    entityId: string;
  }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.deleteEntity(authData.tenantId, entityTable, entityId);
  }
);

// ===== ENTITY-SPECIFIC ENDPOINTS (для обратной совместимости) =====

/**
 * Получение пользователей с расширяемыми полями
 */
export const getUsers = api(
  { auth: true, method: 'GET', path: '/content/users/list' },
  async ({
    limit,
    offset,
    filters,
    sorters,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
    filters?: Query<string>;
    sorters?: Query<string>;
  }): Promise<
    ApiResponse<{
      data: Payload[];
      total: number;
      pagination: { limit: number; offset: number; hasMore: boolean };
    }>
  > => {
    const authData = getAuthData() as AuthData;

    let parsedFilters: ExtensionFieldsFilter[] = [];
    let parsedSorters: ExtensionFieldsSorter[] = [];

    try {
      if (filters) parsedFilters = JSON.parse(filters);
      if (sorters) parsedSorters = JSON.parse(sorters);
    } catch (error) {
      return {
        error: 'Invalid filters or sorters format',
        message: 'Invalid query parameters',
      };
    }

    const result = await ContentService.getEntitiesWithExtensions(authData.tenantId, 'users', {
      limit: limit || 50,
      offset: offset || 0,
      filters: parsedFilters,
      sorters: parsedSorters,
    });

    if (result.error) {
      return result as unknown as ApiResponse<{
        data: Payload[];
        total: number;
        pagination: { limit: number; offset: number; hasMore: boolean };
      }>;
    }

    const pagination = {
      limit: limit || 50,
      offset: offset || 0,
      hasMore: (offset || 0) + (limit || 50) < result.data!.total,
    };

    return {
      data: {
        data: result.data!.data.map(toPayload),
        total: result.data!.total,
        pagination,
      },
      message: `Retrieved ${result.data!.data.length} users with extensions`,
    };
  }
);

/**
 * Получение лидов с расширяемыми полями
 */
export const getLeads = api(
  { auth: true, method: 'GET', path: '/content/leads/list' },
  async ({
    limit,
    offset,
    filters,
    sorters,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
    filters?: Query<string>;
    sorters?: Query<string>;
  }): Promise<
    ApiResponse<{
      data: Payload[];
      total: number;
      pagination: { limit: number; offset: number; hasMore: boolean };
    }>
  > => {
    const authData = getAuthData() as AuthData;

    let parsedFilters: ExtensionFieldsFilter[] = [];
    let parsedSorters: ExtensionFieldsSorter[] = [];

    try {
      if (filters) parsedFilters = JSON.parse(filters);
      if (sorters) parsedSorters = JSON.parse(sorters);
    } catch (error) {
      return {
        error: 'Invalid filters or sorters format',
        message: 'Invalid query parameters',
      };
    }

    const result = await ContentService.getEntitiesWithExtensions(authData.tenantId, 'leads', {
      limit: limit || 50,
      offset: offset || 0,
      filters: parsedFilters,
      sorters: parsedSorters,
    });

    if (result.error) {
      return result as unknown as ApiResponse<{
        data: Payload[];
        total: number;
        pagination: { limit: number; offset: number; hasMore: boolean };
      }>;
    }

    const pagination = {
      limit: limit || 50,
      offset: offset || 0,
      hasMore: (offset || 0) + (limit || 50) < result.data!.total,
    };

    return {
      data: {
        data: result.data!.data.map(toPayload),
        total: result.data!.total,
        pagination,
      },
      message: `Retrieved ${result.data!.data.length} leads with extensions`,
    };
  }
);

/**
 * Получение проектов с расширяемыми полями
 */
export const getProjects = api(
  { auth: true, method: 'GET', path: '/content/projects/list' },
  async ({
    limit,
    offset,
    filters,
    sorters,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
    filters?: Query<string>;
    sorters?: Query<string>;
  }): Promise<
    ApiResponse<{
      data: Payload[];
      total: number;
      pagination: { limit: number; offset: number; hasMore: boolean };
    }>
  > => {
    const authData = getAuthData() as AuthData;

    let parsedFilters: ExtensionFieldsFilter[] = [];
    let parsedSorters: ExtensionFieldsSorter[] = [];

    try {
      if (filters) parsedFilters = JSON.parse(filters);
      if (sorters) parsedSorters = JSON.parse(sorters);
    } catch (error) {
      return {
        error: 'Invalid filters or sorters format',
        message: 'Invalid query parameters',
      };
    }

    const result = await ContentService.getEntitiesWithExtensions(authData.tenantId, 'projects', {
      limit: limit || 50,
      offset: offset || 0,
      filters: parsedFilters,
      sorters: parsedSorters,
    });

    if (result.error) {
      return result as unknown as ApiResponse<{
        data: Payload[];
        total: number;
        pagination: { limit: number; offset: number; hasMore: boolean };
      }>;
    }

    const pagination = {
      limit: limit || 50,
      offset: offset || 0,
      hasMore: (offset || 0) + (limit || 50) < result.data!.total,
    };

    return {
      data: {
        data: result.data!.data.map(toPayload),
        total: result.data!.total,
        pagination,
      },
      message: `Retrieved ${result.data!.data.length} projects with extensions`,
    };
  }
);

// ===== UTILITY ENDPOINTS =====

/**
 * Получение определений полей для сущности (прокси к Tenant Management Service)
 */
export const getFieldDefinitions = api(
  { auth: true, method: 'GET', path: '/content/:entityTable/field-definitions' },
  async ({ entityTable }: { entityTable: string }): Promise<ApiResponse<any[]>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.getFieldDefinitionsForEntity(authData.tenantId, entityTable);
  }
);

/**
 * Валидация данных расширяемых полей
 */
export const validateExtensionFields = api(
  { auth: true, method: 'POST', path: '/content/:entityTable/validate-extensions' },
  async ({
    entityTable,
    extensionFields,
  }: {
    entityTable: string;
    extensionFields: ExtensionFieldValue;
  }): Promise<ApiResponse<{ isValid: boolean; errors: string[] }>> => {
    const authData = getAuthData() as AuthData;
    return ContentService.validateExtensionFields(authData.tenantId, entityTable, extensionFields);
  }
);

/**
 * Получение статистики кеша расширяемых полей
 */
export const getCacheStats = api(
  { auth: true, method: 'GET', path: '/content/cache/stats' },
  async (): Promise<
    ApiResponse<{ fieldDefinitionsCache: { size: number; entries: string[] } }>
  > => {
    return ContentService.getCacheStats();
  }
);

/**
 * Инвалидация кеша расширяемых полей
 */
export const invalidateCache = api(
  { auth: true, method: 'POST', path: '/content/cache/invalidate' },
  async ({
    tenantId,
    entityTable,
  }: {
    tenantId?: string;
    entityTable?: string;
  }): Promise<ApiResponse<boolean>> => {
    return ContentService.invalidateCache(tenantId, entityTable);
  }
);
