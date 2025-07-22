import { Service } from 'encore.dev/service';
import { gateway } from './auth';

// Import middleware in the correct order
import { corsMiddleware } from './middleware/cors';
import { tenantValidationMiddleware } from './middleware/tenant-validation';
import { rateLimitingMiddleware } from './middleware/rate-limiting';
import { loggingMiddleware } from './middleware/logging';

/**
 * API Gateway Service
 * Single entry point for all external API requests
 *
 * Middleware execution order (critical):
 * 1. CORS - Handle preflight requests and origin validation
 * 2. Tenant Validation - Extract and validate tenantId
 * 3. Auth - Authentication handled by gateway authHandler
 * 4. Rate Limiting - Apply limits based on tenant/user/IP
 * 5. Logging - Log all requests/responses and metrics
 */
export default new Service('api-gateway', {
  middlewares: [
    corsMiddleware, // 1. CORS handling
    tenantValidationMiddleware, // 2. Tenant validation
    rateLimitingMiddleware, // 3. Rate limiting (after auth via gateway)
    loggingMiddleware, // 4. Request/response logging
  ],
});

// Export gateway for use in endpoints
export { gateway };
