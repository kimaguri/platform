import { api } from 'encore.dev/api';
import type { HealthCheckResponse, ServiceHealth } from '../models/gateway';

// Track service health status
const serviceHealthCache = new Map<string, ServiceHealth>();
const gatewayStartTime = Date.now();

/**
 * Aggregate health check for all services
 */
export const healthCheck = api(
  { method: 'GET', path: '/api/v1/health', expose: true },
  async (): Promise<HealthCheckResponse> => {
    const services: ServiceHealth[] = [
      {
        serviceName: 'tenant-management',
        status: 'healthy', // This would normally check the actual service
        responseTime: 50,
        lastCheck: new Date().toISOString(),
      },
      {
        serviceName: 'user-management',
        status: 'healthy',
        responseTime: 45,
        lastCheck: new Date().toISOString(),
      },
      {
        serviceName: 'content-management',
        status: 'healthy',
        responseTime: 60,
        lastCheck: new Date().toISOString(),
      },
    ];

    // Determine overall status
    const hasUnhealthy = services.some((s) => s.status === 'unhealthy');
    const hasUnknown = services.some((s) => s.status === 'unknown');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasUnknown) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - gatewayStartTime,
    };
  }
);

/**
 * Detailed health check for a specific service
 */
export const serviceHealthCheck = api(
  { method: 'GET', path: '/api/v1/health/:serviceName', expose: true },
  async ({ serviceName }: { serviceName: string }): Promise<ServiceHealth> => {
    // This would normally make an actual health check call to the service
    const mockHealth: ServiceHealth = {
      serviceName,
      status: 'healthy',
      responseTime: Math.floor(Math.random() * 100) + 20,
      lastCheck: new Date().toISOString(),
    };

    // Cache the result
    serviceHealthCache.set(serviceName, mockHealth);

    return mockHealth;
  }
);

/**
 * Gateway readiness check
 */
export const readinessCheck = api(
  { method: 'GET', path: '/api/v1/ready', expose: true },
  async (): Promise<{ ready: boolean; timestamp: string }> => {
    // Check if gateway is ready to serve requests
    // This could include checking database connections, cache availability, etc.

    return {
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Gateway liveness check
 */
export const livenessCheck = api(
  { method: 'GET', path: '/api/v1/live', expose: true },
  async (): Promise<{ alive: boolean; uptime: number; timestamp: string }> => {
    return {
      alive: true,
      uptime: Date.now() - gatewayStartTime,
      timestamp: new Date().toISOString(),
    };
  }
);
