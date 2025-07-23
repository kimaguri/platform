/**
 * Base types for functional database adapters
 * Following Encore.ts functional approach - no classes, only functions
 */

export interface QueryParams {
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
  select?: string | string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
}

export interface Adapter<T = any> {
  connect(): Promise<void>;
  disconnect?(): Promise<void>;
  query(params?: QueryParams): Promise<T[]>;
  queryOne(id: string): Promise<T | null>;
  insert(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: Record<string, any>): Promise<number>;
}

export interface AdapterConfig {
  type: 'supabase' | 'postgres' | 'mongodb';
  [key: string]: any;
}

export type AdapterFactory<T = any> = (config: AdapterConfig & { table: string }) => Adapter<T>;
