import { middleware } from 'encore.dev/api';
import type { AuthData } from '../auth';

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
      const { getTenantConfigById } = await import('../../lib/utils/tenant-config');
      await getTenantConfigById(authData.tenantId);
      // Configuration is now cached for subsequent use
    } catch (error) {
      // Log but don't fail - the actual endpoint will handle this
      console.warn(`Failed to pre-cache tenant config for ${authData.tenantId}:`, error);
    }
  }

  return await next(req);
});
