import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter } from '../base/database-adapter';
import type { QueryParams, ConnectionConfig } from '../../shared/types/connector';

/**
 * Supabase configuration interface
 */
export interface SupabaseConfig extends ConnectionConfig {
  url: string;
  key: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
    };
  };
}

/**
 * Supabase adapter implementing database operations
 */
export class SupabaseAdapter extends DatabaseAdapter {
  private client: SupabaseClient;

  constructor(config: SupabaseConfig) {
    super(config);
    this.client = createClient(config.url, config.key, config.options);
  }

  async connect(): Promise<void> {
    try {
      // Test connection by getting session
      const { error } = await this.client.auth.getSession();
      if (error && error.message !== 'No session found') {
        throw error;
      }
      this.connected = true;
    } catch (error) {
      throw new Error(
        `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async query<T>(resourceName: string, params?: QueryParams): Promise<T[]> {
    let query = this.client.from(resourceName).select(params?.select || '*');

    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    if (params?.orderBy) {
      query = query.order(params.orderBy);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Query failed: ${error.message}`);
    return data as T[];
  }

  async insert<T>(resourceName: string, data: T): Promise<T> {
    const { data: result, error } = await this.client
      .from(resourceName)
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Insert failed: ${error.message}`);
    return result as T;
  }

  async insertMany<T>(resourceName: string, data: T[]): Promise<T[]> {
    const { data: result, error } = await this.client.from(resourceName).insert(data).select();

    if (error) throw new Error(`Insert many failed: ${error.message}`);
    return result as T[];
  }

  async update<T>(resourceName: string, id: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(resourceName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Update failed: ${error.message}`);
    return result as T;
  }

  async upsert<T>(resourceName: string, data: T, conflictColumns?: string[]): Promise<T> {
    const { data: result, error } = await this.client
      .from(resourceName)
      .upsert(data, {
        onConflict: conflictColumns?.join(',') || 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Upsert failed: ${error.message}`);
    return result as T;
  }

  async delete(resourceName: string, id: string): Promise<boolean> {
    const { error } = await this.client.from(resourceName).delete().eq('id', id);

    if (error) throw new Error(`Delete failed: ${error.message}`);
    return true;
  }

  async executeRaw<T>(query: string, params?: any[]): Promise<T> {
    // For now, return a placeholder - raw SQL execution would need a custom function
    throw new Error('Raw SQL execution not implemented yet');
  }

  async disconnect(): Promise<void> {
    // Supabase client doesn't need explicit disconnect
    this.connected = false;
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
