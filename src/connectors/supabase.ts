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
      client = createClient(config.supabaseUrl, config.supabaseKey);
    },

    async disconnect() {
      // Supabase client doesn't require explicit disconnection
    },

    async query(params: QueryParams = {}): Promise<T[]> {
      let query = client
        .from(config.table)
        .select(Array.isArray(params.select) ? params.select.join(',') : params.select || '*');

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
      const { data: result, error } = await client
        .from(config.table)
        .insert(data)
        .select()
        .single();

      if (error) throw new Error(`Supabase insert error: ${error.message}`);
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
      const { error } = await client.from(config.table).delete().eq('id', id);

      if (error) throw new Error(`Supabase delete error: ${error.message}`);
      return true;
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
