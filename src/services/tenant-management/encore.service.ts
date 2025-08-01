import { Service } from 'encore.dev/service';

/**
 * Tenant Management Service
 * Internal RPC service for tenant operations
 *
 * This service is called internally by the API Gateway
 * All external endpoints are now handled by the Gateway
 * No middleware needed - Gateway handles all cross-cutting concerns
 */
export default new Service('tenant-management');

// Import API endpoints to register them with the service
import './api';
