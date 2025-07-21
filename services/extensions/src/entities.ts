import { api, Query } from 'encore.dev/api';
import { getSupabaseAnonClient } from '../../../src/shared/supabaseClient';
import { EntityData, ApiResponse } from '../../../src/shared/types';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../../../src/shared/auth';

interface ListEntitiesRequest {
  entity: string; // Название таблицы/сущности
  limit?: Query<number>; // Лимит записей (опциональный)
  offset?: Query<number>; // Смещение для пагинации (опциональный)
}

interface GetEntityRequest {
  entity: string;
  id: string; // ID записи
}

interface CreateEntityRequest {
  entity: string;
  data: Record<string, any>; // Данные для создания
}

interface UpdateEntityRequest {
  entity: string;
  id: string;
  data: Record<string, any>; // Данные для обновления
}

interface UpsertEntityRequest {
  entity: string;
  data: Record<string, any>; // Данные для upsert
  conflictColumns?: string[]; // Колонки для определения конфликта
}

interface DeleteEntityRequest {
  entity: string;
  id: string;
}

/**
 * Получить список записей из указанной таблицы
 * Использует centralized authentication
 */
export const listEntities = api(
  { auth: true, method: 'GET', path: '/entities/:entity', expose: true },
  async ({ entity, limit, offset }: ListEntitiesRequest): Promise<ApiResponse<EntityData[]>> => {
    try {
      const authData = getAuthData() as AuthData;
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      let query = supabase.from(entity).select('*');

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return {
          error: error.message,
          message: 'Failed to fetch entities',
        };
      }

      return {
        data: data || [],
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
 * Использует centralized authentication
 */
export const getEntity = api(
  { auth: true, method: 'GET', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id }: GetEntityRequest): Promise<ApiResponse<EntityData>> => {
    try {
      const authData = getAuthData() as AuthData;
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      const { data, error } = await supabase.from(entity).select('*').eq('id', id).single();

      if (error) {
        return {
          error: error.message,
          message: 'Failed to fetch entity',
        };
      }

      return {
        data,
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
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const createEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity', expose: true },
  async ({ entity, data }: CreateEntityRequest): Promise<ApiResponse<EntityData>> => {
    try {
      const authData = getAuthData() as AuthData;
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      const { data: result, error } = await supabase.from(entity).insert(data).select().single();

      if (error) {
        return {
          error: error.message,
          message: 'Failed to create entity',
        };
      }

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
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const updateEntity = api(
  { auth: true, method: 'PUT', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id, data }: UpdateEntityRequest): Promise<ApiResponse<EntityData>> => {
    try {
      const authData = getAuthData() as AuthData;
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      const { data: result, error } = await supabase
        .from(entity)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          error: error.message,
          message: 'Failed to update entity',
        };
      }

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
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const deleteEntity = api(
  { auth: true, method: 'DELETE', path: '/entities/:entity/:id', expose: true },
  async ({ entity, id }: DeleteEntityRequest): Promise<ApiResponse<null>> => {
    try {
      const authData = getAuthData() as AuthData;
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      const { error } = await supabase.from(entity).delete().eq('id', id);

      if (error) {
        return {
          error: error.message,
          message: 'Failed to delete entity',
        };
      }

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
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const upsertEntity = api(
  { auth: true, method: 'POST', path: '/entities/:entity/upsert', expose: true },
  async ({
    entity,
    data,
    conflictColumns,
  }: UpsertEntityRequest): Promise<ApiResponse<EntityData>> => {
    try {
      const authData = getAuthData() as AuthData;
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      const upsertOptions = conflictColumns
        ? {
            onConflict: conflictColumns.join(','),
          }
        : undefined;

      const { data: result, error } = await supabase
        .from(entity)
        .upsert(data, upsertOptions)
        .select()
        .single();

      if (error) {
        return {
          error: error.message,
          message: 'Failed to upsert entity',
        };
      }

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
