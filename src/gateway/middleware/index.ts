// Export remaining middleware from their respective modules
// Note: tenant validation is now handled in auth.ts
// Performance monitoring is handled in logging.ts

// Re-export auth handler for compatibility
export { auth } from '../auth';
