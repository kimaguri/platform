import { middleware } from 'encore.dev/api';
import { APIError } from 'encore.dev/api';
import { hasTenantConfig } from '../../shared/utilities/tenant-config';

/**
 * Tenant Validation Middleware
 * Extracts and validates tenantId from X-Tenant-ID header
 *
 * This middleware runs after CORS but before auth
 * to ensure all requests have a valid tenant context
 */
export const tenantValidationMiddleware = middleware(
  { target: { auth: false } }, // Run for non-auth endpoints too
  async (req, next) => {
    const data = req.data;

    // Extract tenantId from headers
    const tenantId = data.headers?.['x-tenant-id'] || data.headers?.['X-Tenant-ID'];

    if (!tenantId) {
      throw APIError.invalidArgument('X-Tenant-ID header is required');
    }

    // Validate tenant exists and is active
    try {
      const hasConfig = await hasTenantConfig(tenantId);
      if (!hasConfig) {
        throw APIError.notFound(`Tenant '${tenantId}' not found or inactive`);
      }
    } catch (error) {
      console.error('Tenant validation error:', error);
      throw APIError.notFound(`Tenant '${tenantId}' not found or inactive`);
    }

    // Continue to next middleware
    return await next(req);
  }
);
