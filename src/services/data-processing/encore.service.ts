import { Service } from 'encore.dev/service';

/**
 * Content Management Service
 * Internal RPC service for content operations
 *
 * This service is called internally by the API Gateway
 * All external endpoints are now handled by the Gateway
 * No middleware needed - Gateway handles all cross-cutting concerns
 */
export default new Service('data-processing');

// Import API endpoints to register them with the service
import './api';
