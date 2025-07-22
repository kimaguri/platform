// Export all middleware from their respective modules
export { tenantValidationMiddleware, tenantConfigMiddleware } from './tenant/tenant-validation';
export { rateLimitMiddleware } from './auth/rate-limiting';
export {
  performanceMiddleware,
  cachingMiddleware,
} from '../utilities/helpers/performance-middleware';

// Re-export auth handler for compatibility
export { auth } from './auth/auth-handler';
