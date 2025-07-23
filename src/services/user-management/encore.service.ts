import { Service } from 'encore.dev/service';

/**
 * User Management Service
 * Internal RPC service for user operations
 *
 * Functional approach - no classes, only pure functions
 * No middleware - all handled by API Gateway
 * Called internally by Gateway via RPC
 */
export default new Service('user-management');
