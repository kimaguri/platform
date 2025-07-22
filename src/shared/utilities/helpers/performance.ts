import { SupabaseClient } from '@supabase/supabase-js';
import { getTenantConfigById } from '../tenant-config';

// Enhanced caching system for better performance
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class EnhancedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // 5 minutes default
    this.defaultTTL = defaultTTL;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  set(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instances
export const tenantConfigCache = new EnhancedCache(10 * 60 * 1000); // 10 minutes
export const entityDefinitionsCache = new EnhancedCache(15 * 60 * 1000); // 15 minutes
export const queryResultsCache = new EnhancedCache(2 * 60 * 1000); // 2 minutes
export const metadataCache = new EnhancedCache(30 * 60 * 1000); // 30 minutes

// Connection pooling for Supabase clients
class SupabaseConnectionPool {
  private pools = new Map<string, SupabaseClient[]>();
  private maxConnections = 5;
  private activeConnections = new Map<string, number>();

  async getConnection(tenantId: string): Promise<SupabaseClient> {
    const poolKey = `${tenantId}`;

    // Check if we have available connections in pool
    let pool = this.pools.get(poolKey);
    if (!pool) {
      pool = [];
      this.pools.set(poolKey, pool);
      this.activeConnections.set(poolKey, 0);
    }

    // Return available connection from pool
    if (pool.length > 0) {
      return pool.pop()!;
    }

    // Create new connection if under limit
    const activeCount = this.activeConnections.get(poolKey) || 0;
    if (activeCount < this.maxConnections) {
      this.activeConnections.set(poolKey, activeCount + 1);

      const config = await getTenantConfigById(tenantId);
      const { createClient } = await import('@supabase/supabase-js');

      return createClient(config.SUPABASE_URL, config.ANON_KEY);
    }

    // Wait and retry if at connection limit
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.getConnection(tenantId);
  }

  returnConnection(tenantId: string, client: SupabaseClient): void {
    const poolKey = `${tenantId}`;
    const pool = this.pools.get(poolKey);

    if (pool && pool.length < this.maxConnections) {
      pool.push(client);
    } else {
      // Reduce active connection count
      const activeCount = this.activeConnections.get(poolKey) || 0;
      this.activeConnections.set(poolKey, Math.max(0, activeCount - 1));
    }
  }

  getStats(): Record<string, { poolSize: number; activeConnections: number }> {
    const stats: Record<string, { poolSize: number; activeConnections: number }> = {};

    for (const [key, pool] of this.pools.entries()) {
      stats[key] = {
        poolSize: pool.length,
        activeConnections: this.activeConnections.get(key) || 0,
      };
    }

    return stats;
  }
}

export const connectionPool = new SupabaseConnectionPool();

// Query optimization utilities
export interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  retries?: number;
}

export async function optimizedQuery<T>(
  tenantId: string,
  queryFn: (client: SupabaseClient) => Promise<T>,
  cacheKey?: string,
  options: QueryOptions = {}
): Promise<T> {
  const {
    useCache = true,
    cacheTTL = 2 * 60 * 1000, // 2 minutes
    timeout = 30000, // 30 seconds
    retries = 2,
  } = options;

  // Check cache first
  if (useCache && cacheKey) {
    const cached = queryResultsCache.get(cacheKey);
    if (cached !== null) {
      return cached as T;
    }
  }

  let lastError: Error | null = null;
  let client: SupabaseClient | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      client = await connectionPool.getConnection(tenantId);

      // Execute query with timeout
      const result = await Promise.race([
        queryFn(client),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        ),
      ]);

      // Cache successful result
      if (useCache && cacheKey) {
        queryResultsCache.set(cacheKey, result, cacheTTL);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Query attempt ${attempt + 1} failed:`, lastError.message);

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } finally {
      if (client) {
        connectionPool.returnConnection(tenantId, client);
      }
    }
  }

  throw lastError || new Error('Query failed after all retries');
}

// Batch operations for better performance
export async function batchEntityOperations<T>(
  tenantId: string,
  tableName: string,
  operations: Array<{
    type: 'insert' | 'update' | 'delete';
    data: any;
    id?: string;
  }>,
  batchSize: number = 100
): Promise<T[]> {
  const results: T[] = [];

  // Group operations by type for efficiency
  const grouped = operations.reduce((acc, op) => {
    if (!acc[op.type]) acc[op.type] = [];
    acc[op.type].push(op);
    return acc;
  }, {} as Record<string, typeof operations>);

  for (const [type, ops] of Object.entries(grouped)) {
    // Process in batches
    for (let i = 0; i < ops.length; i += batchSize) {
      const batch = ops.slice(i, i + batchSize);

      const batchResult = await optimizedQuery(
        tenantId,
        async (client) => {
          switch (type) {
            case 'insert':
              const insertData = batch.map((op) => op.data);
              const { data: insertResult } = await client
                .from(tableName)
                .insert(insertData)
                .select();
              return insertResult;

            case 'update':
              const updatePromises = batch.map((op) =>
                client.from(tableName).update(op.data).eq('id', op.id).select().single()
              );
              const updateResults = await Promise.all(updatePromises);
              return updateResults.map((r) => r.data);

            case 'delete':
              const deletePromises = batch.map((op) =>
                client.from(tableName).delete().eq('id', op.id).select().single()
              );
              const deleteResults = await Promise.all(deletePromises);
              return deleteResults.map((r) => r.data);

            default:
              throw new Error(`Unknown operation type: ${type}`);
          }
        },
        `batch_${type}_${tableName}_${i}`,
        { useCache: false } // Don't cache batch operations
      );

      if (batchResult) {
        results.push(...(Array.isArray(batchResult) ? batchResult : [batchResult]));
      }
    }
  }

  return results;
}

// Performance monitoring
export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: number;
  }>;
}

class PerformanceMonitor {
  private metrics = {
    requests: 0,
    totalResponseTime: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    slowQueries: [] as Array<{ query: string; duration: number; timestamp: number }>,
  };

  recordRequest(duration: number, error?: boolean): void {
    this.metrics.requests++;
    this.metrics.totalResponseTime += duration;

    if (error) {
      this.metrics.errors++;
    }

    // Track slow queries (>1 second)
    if (duration > 1000) {
      this.metrics.slowQueries.push({
        query: 'request',
        duration,
        timestamp: Date.now(),
      });

      // Keep only last 100 slow queries
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-100);
      }
    }
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  getMetrics(): PerformanceMetrics {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;

    return {
      totalRequests: this.metrics.requests,
      averageResponseTime:
        this.metrics.requests > 0 ? this.metrics.totalResponseTime / this.metrics.requests : 0,
      errorRate:
        this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      cacheHitRate:
        totalCacheRequests > 0 ? (this.metrics.cacheHits / totalCacheRequests) * 100 : 0,
      slowQueries: [...this.metrics.slowQueries],
    };
  }

  reset(): void {
    this.metrics = {
      requests: 0,
      totalResponseTime: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      slowQueries: [],
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Utility to get all performance stats
export function getPerformanceStats() {
  return {
    monitor: performanceMonitor.getMetrics(),
    caches: {
      tenantConfig: tenantConfigCache.getStats(),
      entityDefinitions: entityDefinitionsCache.getStats(),
      queryResults: queryResultsCache.getStats(),
      metadata: metadataCache.getStats(),
    },
    connectionPool: connectionPool.getStats(),
  };
}
