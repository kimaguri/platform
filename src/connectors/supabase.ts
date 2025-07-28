import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Adapter, QueryParams, AdapterConfig } from './base';

/**
 * Functional Supabase adapter factory
 * Creates adapter instance without classes, following Encore.ts best practices
 */
export default function createSupabaseAdapter<T = any>(
  config: AdapterConfig & {
    table: string;
    supabaseUrl: string;
    supabaseKey: string;
  }
): Adapter<T> {
  let client: SupabaseClient;

  return {
    async connect() {
      console.log('[SupabaseAdapter] Connecting with config:', { 
        hasJwtToken: !!config.jwtToken, 
        table: config.table,
        supabaseUrl: config.supabaseUrl?.substring(0, 30) + '...' 
      });
      
      client = createClient(config.supabaseUrl, config.supabaseKey);
      
      // Устанавливаем JWT токен для аутентификации операций записи
      if (config.jwtToken) {
        console.log('[SupabaseAdapter] Setting JWT session for authenticated operations');
        
        // Правильная структура сессии для Supabase
        const sessionResult = await client.auth.setSession({
          access_token: config.jwtToken,
          refresh_token: config.jwtToken // Используем тот же токен как refresh_token
        });
        
        if (sessionResult.error) {
          console.error('[SupabaseAdapter] Failed to set session:', sessionResult.error.message);
        } else {
          console.log('[SupabaseAdapter] JWT session set successfully:', {
            hasUser: !!sessionResult.data.user,
            userId: sessionResult.data.user?.id
          });
        }
      } else {
        console.log('[SupabaseAdapter] No JWT token provided, using anon access');
      }
    },

    async disconnect() {
      // Supabase client doesn't require explicit disconnection
    },

    async query(params: QueryParams = {}): Promise<T[]> {
      // Используем meta.select если доступен, иначе fallback на params.select или '*'
      const selectClause = params.meta?.select || params.select || '*';

      // Обрабатываем select - если массив, соединяем через запятую
      const selectString = Array.isArray(selectClause) ? selectClause.join(',') : selectClause;

      let query = client.from(config.table).select(selectString);

      // Apply filters
      if (params.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (params.orderBy) {
        params.orderBy.forEach(({ field, direction }) => {
          query = query.order(field, { ascending: direction === 'asc' });
        });
      }

      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 1000) - 1);
      }

      const { data, error } = await query;

      if (error) throw new Error(`Supabase query error: ${error.message}`);
      return (data || []) as T[];
    },

    async queryOne(id: string): Promise<T | null> {
      const { data, error } = await client.from(config.table).select('*').eq('id', id).single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw new Error(`Supabase queryOne error: ${error.message}`);
      }
      return data as T;
    },

    async insert(data: Omit<T, 'id'>): Promise<T> {
      // Удаляем tenant_id из данных для вставки, так как каждый тенант имеет отдельную БД
      const { tenant_id, ...insertData } = data as any;
      
      // Проверяем текущего пользователя и роль
      const { data: { user }, error: userError } = await client.auth.getUser();
      const currentRole = await client.rpc('current_setting', { setting_name: 'role' }).single();
      
      console.log('[SupabaseAdapter] Attempting insert with data:', {
        table: config.table,
        insertData,
        hasAuthSession: !!client.auth.getSession(),
        currentUser: user?.id || 'none',
        currentRole: currentRole?.data || 'unknown',
        userError: userError?.message
      });
      
      const { data: result, error } = await client
        .from(config.table)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseAdapter] Insert error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Supabase insert error: ${error.message}`);
      }

      console.log('[SupabaseAdapter] Insert successful:', {
        result
      });

      return result as T;
    },

    async update(id: string, data: Partial<T>): Promise<T | null> {
      const { data: result, error } = await client
        .from(config.table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw new Error(`Supabase update error: ${error.message}`);
      }
      return result as T;
    },

    async delete(id: string): Promise<boolean> {
      console.log('[SupabaseAdapter] Attempting delete with:', {
        table: config.table,
        id,
        hasAuthSession: !!client.auth.getSession()
      });
      
      const { data, error, count } = await client
        .from(config.table)
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('[SupabaseAdapter] Delete error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Supabase delete error: ${error.message}`);
      }
      
      const deletedCount = data?.length || 0;
      console.log('[SupabaseAdapter] Delete result:', {
        deletedCount,
        deletedRecords: data
      });
      
      return deletedCount > 0;
    },

    async count(filter: Record<string, any> = {}): Promise<number> {
      let query = client.from(config.table).select('*', { count: 'exact', head: true });

      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;
      if (error) throw new Error(`Supabase count error: ${error.message}`);
      return count || 0;
    },
  };
}
