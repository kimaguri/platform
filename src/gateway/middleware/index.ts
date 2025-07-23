// Export all middleware from their respective modules
export { tenantValidationMiddleware } from './tenant-validation';
export { performanceMiddleware, cachingMiddleware } from './performance';

// Re-export auth handler for compatibility
export { auth } from '../auth';
