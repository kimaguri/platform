import { Client } from 'pg';
import type { Adapter, QueryParams, AdapterConfig } from './base';

/**
 * Functional PostgreSQL adapter factory
 * Creates adapter instance without classes, following Encore.ts best practices
 */
export default function createPostgresAdapter<T = any>(
  config: AdapterConfig & {
    table: string;
    connectionString: string;
  }
): Adapter<T> {
  let client: Client;

  return {
    async connect() {
      client = new Client({ connectionString: config.connectionString });
      await client.connect();
    },

    async disconnect() {
      if (client) {
        await client.end();
      }
    },

    async query(params: QueryParams = {}): Promise<T[]> {
      const selectFields = Array.isArray(params.select)
        ? params.select.join(', ')
        : params.select || '*';

      let sql = `SELECT ${selectFields} FROM ${config.table}`;
      const values: any[] = [];
      let paramCount = 0;

      // Apply filters
      if (params.filter && Object.keys(params.filter).length > 0) {
        const conditions: string[] = [];
        Object.entries(params.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            paramCount++;
            conditions.push(`${key} = $${paramCount}`);
            values.push(value);
          }
        });
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      // Apply ordering
      if (params.orderBy && params.orderBy.length > 0) {
        const orderClauses = params.orderBy.map(
          ({ field, direction }) => `${field} ${direction.toUpperCase()}`
        );
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }

      // Apply pagination
      if (params.limit) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        values.push(params.limit);
      }
      if (params.offset) {
        paramCount++;
        sql += ` OFFSET $${paramCount}`;
        values.push(params.offset);
      }

      const result = await client.query(sql, values);
      return result.rows as T[];
    },

    async queryOne(id: string): Promise<T | null> {
      const sql = `SELECT * FROM ${config.table} WHERE id = $1`;
      const result = await client.query(sql, [id]);
      return result.rows[0] || null;
    },

    async insert(data: Omit<T, 'id'>): Promise<T> {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

      const sql = `
        INSERT INTO ${config.table} (${keys.join(', ')}) 
        VALUES (${placeholders}) 
        RETURNING *
      `;

      const result = await client.query(sql, values);
      return result.rows[0] as T;
    },

    async update(id: string, data: Partial<T>): Promise<T | null> {
      const keys = Object.keys(data);
      const values = Object.values(data);

      if (keys.length === 0) return null;

      const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const sql = `
        UPDATE ${config.table} 
        SET ${setClauses} 
        WHERE id = $${keys.length + 1} 
        RETURNING *
      `;

      const result = await client.query(sql, [...values, id]);
      return result.rows[0] || null;
    },

    async delete(id: string): Promise<boolean> {
      const sql = `DELETE FROM ${config.table} WHERE id = $1`;
      const result = await client.query(sql, [id]);
      return (result.rowCount ?? 0) > 0;
    },

    async count(filter: Record<string, any> = {}): Promise<number> {
      let sql = `SELECT COUNT(*) FROM ${config.table}`;
      const values: any[] = [];
      let paramCount = 0;

      if (Object.keys(filter).length > 0) {
        const conditions: string[] = [];
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            paramCount++;
            conditions.push(`${key} = $${paramCount}`);
            values.push(value);
          }
        });
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      const result = await client.query(sql, values);
      return parseInt(result.rows[0].count, 10);
    },
  };
}
