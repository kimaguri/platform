import { Service } from 'encore.dev/service';
import { gateway } from './auth';

// Import middleware in the correct order
import { corsMiddleware } from './middleware/cors';
import { rateLimitingMiddleware } from './middleware/rate-limiting';
import { loggingMiddleware } from './middleware/logging';

/**
 * API Gateway Service
 * Single entry point for all external API requests
 *
 * Middleware execution order (simplified):
 * 1. CORS - Handle preflight requests and origin validation
 * 2. Auth - Authentication handled by gateway authHandler (includes tenant validation)
 * 3. Rate Limiting - Apply limits based on tenant/user/IP
 * 4. Logging - Log all requests/responses and metrics
 */
export default new Service('api-gateway', {
  middlewares: [
    corsMiddleware,           // 1. CORS handling
    rateLimitingMiddleware,   // 2. Rate limiting (after auth via gateway)
    loggingMiddleware,        // 3. Request/response logging
  ],
});

// Export gateway for use in endpoints
export { gateway };
