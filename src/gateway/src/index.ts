// API Gateway Service - Main Index
// Single entry point for all external API requests via /api/v1/*

// Export health and metrics endpoints
export * from './handlers/health';
export * from './handlers/metrics';

// Export new unified API endpoints (replacing old routing files)
export * from '../endpoints/user-endpoints';
export * from '../endpoints/tenant-endpoints';
export * from '../endpoints/content-endpoints';

// Export auth handler and gateway for internal use
export { auth, gateway } from '../auth';
