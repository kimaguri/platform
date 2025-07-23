import { middleware } from 'encore.dev/api';
import { APIError } from 'encore.dev/api';
import { hasTenantConfig, getTenantConfigById } from '../../lib/config/tenantConfig';
import type { AuthData } from '../auth';

// Cache for tenant validation to avoid repeated database calls
const tenantValidationCache = new Map<string, number>();
const TENANT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Global middleware for tenant validation that applies to all authenticated endpoints
export const tenantValidationMiddleware = middleware(
  { target: { auth: true } },
  async (req, next) => {
    const authData = req.data.auth as AuthData;

    if (!authData?.tenantId) {
      throw APIError.invalidArgument('Tenant ID is required');
    }

    // Check cache first
    const cacheKey = `tenant:${authData.tenantId}`;
    const cached = tenantValidationCache.get(cacheKey);
    const now = Date.now();

    if (cached !== undefined && now - cached < TENANT_CACHE_TTL) {
      // Tenant is valid and cached
      req.data.tenantValidated = true;
      return await next(req);
    }

    try {
      // Validate tenant exists and is active
      const hasConfig = await hasTenantConfig(authData.tenantId);

      if (!hasConfig) {
        throw APIError.notFound(`Tenant '${authData.tenantId}' not found or inactive`);
      }

      // Cache the successful validation
      tenantValidationCache.set(cacheKey, now);
      req.data.tenantValidated = true;

      return await next(req);
    } catch (error) {
      console.error(`Tenant validation failed for ${authData.tenantId}:`, error);
      throw APIError.notFound('Invalid or inactive tenant');
    }
  }
);

// Middleware for performance monitoring and logging
export const performanceMiddleware = middleware({ target: { auth: true } }, async (req, next) => {
  const startTime = Date.now();
  const authData = req.data.auth as AuthData;

  try {
    const response = await next(req);

    const duration = Date.now() - startTime;

    // Log performance metrics (in production, send to monitoring service)
    console.log(`API Performance: ${req.data.endpoint} - ${duration}ms`, {
      endpoint: req.data.endpoint,
      tenantId: authData?.tenantId,
      userId: authData?.userID,
      duration,
      success: true,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`API Error: ${req.data.endpoint} - ${duration}ms`, {
      endpoint: req.data.endpoint,
      tenantId: authData?.tenantId,
      userId: authData?.userID,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    });

    throw error;
  }
});

// Middleware for caching frequently accessed data
export const cachingMiddleware = middleware({ target: { auth: true } }, async (req, next) => {
  const authData = req.data.auth as AuthData;

  // Pre-load tenant configuration into cache for this request
  if (authData?.tenantId) {
    try {
      await getTenantConfigById(authData.tenantId);
      // Configuration is now cached for subsequent use
    } catch (error) {
      // Log but don't fail - the actual endpoint will handle this
      console.warn(`Failed to pre-cache tenant config for ${authData.tenantId}:`, error);
    }
  }

  return await next(req);
});

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export const rateLimitMiddleware = middleware({ target: { auth: true } }, async (req, next) => {
  const authData = req.data.auth as AuthData;
  const key = `${authData?.tenantId}:${authData?.userID}`;
  const now = Date.now();

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    // Reset or initialize counter
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    current.count++;

    if (current.count > RATE_LIMIT_REQUESTS) {
      throw APIError.resourceExhausted('Rate limit exceeded. Please try again later.');
    }
  }

  return await next(req);
});

// Middleware for tenant-specific configuration injection
export const tenantConfigMiddleware = middleware({ target: { auth: true } }, async (req, next) => {
  const authData = req.data.auth as AuthData;

  if (authData?.tenantId) {
    try {
      const tenantConfig = await getTenantConfigById(authData.tenantId);
      req.data.tenantConfig = tenantConfig;
    } catch (error) {
      console.error(`Failed to load tenant config for ${authData.tenantId}:`, error);
      // Let the endpoint handle the missing config
    }
  }

  return await next(req);
});

// Clear caches periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();

  // Clear expired tenant validation cache
  for (const [key, timestamp] of tenantValidationCache.entries()) {
    if (now - timestamp > TENANT_CACHE_TTL) {
      tenantValidationCache.delete(key);
    }
  }

  // Clear expired rate limit entries
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
