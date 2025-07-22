import { middleware } from 'encore.dev/api';
import { APIError } from 'encore.dev/api';
import { hasTenantConfig, getTenantConfigById } from '../../tenantConfig';
import type { AuthData } from '../auth/auth-handler';

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

// Clear tenant validation cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of tenantValidationCache.entries()) {
    if (now - timestamp > TENANT_CACHE_TTL) {
      tenantValidationCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
