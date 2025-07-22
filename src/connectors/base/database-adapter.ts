import type { QueryParams, ConnectionConfig } from '../../shared/types/connector';

/**
 * Abstract database adapter providing unified interface for different database systems
 * Implements the Adapter pattern for database operations
 */
export abstract class DatabaseAdapter {
  protected config: ConnectionConfig;
  protected connected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  /**
   * Establish connection to the database
   */
  abstract connect(): Promise<void>;

  /**
   * Execute a query with optional parameters
   * @param resourceName Table/collection name
   * @param params Query parameters (select, filter, limit, etc.)
   * @returns Query results
   */
  abstract query<T>(resourceName: string, params?: QueryParams): Promise<T[]>;

  /**
   * Insert a single record
   * @param resourceName Table/collection name
   * @param data Data to insert
   * @returns Inserted record
   */
  abstract insert<T>(resourceName: string, data: T): Promise<T>;

  /**
   * Insert multiple records
   * @param resourceName Table/collection name
   * @param data Array of data to insert
   * @returns Inserted records
   */
  abstract insertMany<T>(resourceName: string, data: T[]): Promise<T[]>;

  /**
   * Update a record by ID
   * @param resourceName Table/collection name
   * @param id Record ID
   * @param data Data to update
   * @returns Updated record
   */
  abstract update<T>(resourceName: string, id: string, data: Partial<T>): Promise<T>;

  /**
   * Upsert (insert or update) a record
   * @param resourceName Table/collection name
   * @param data Data to upsert
   * @param conflictColumns Columns to check for conflicts
   * @returns Upserted record
   */
  abstract upsert<T>(resourceName: string, data: T, conflictColumns?: string[]): Promise<T>;

  /**
   * Delete a record by ID
   * @param resourceName Table/collection name
   * @param id Record ID
   * @returns Success status
   */
  abstract delete(resourceName: string, id: string): Promise<boolean>;

  /**
   * Execute raw SQL/query
   * @param query Raw query string
   * @param params Query parameters
   * @returns Query results
   */
  abstract executeRaw<T>(query: string, params?: any[]): Promise<T>;

  /**
   * Close database connection
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if connected to database
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get connection configuration
   */
  getConfig(): ConnectionConfig {
    return { ...this.config };
  }
}
