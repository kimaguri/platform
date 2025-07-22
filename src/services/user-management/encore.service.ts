import { Service } from 'encore.dev/service';

/**
 * User Management Service
 * Internal RPC service for user operations
 *
 * This service is called internally by the API Gateway
 * All external endpoints are now handled by the Gateway
 * No middleware needed - Gateway handles all cross-cutting concerns
 */
export default new Service('user-management');
