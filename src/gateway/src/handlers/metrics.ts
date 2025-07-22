import { api } from 'encore.dev/api';
import type { MetricsResponse, GatewayMetrics, ServiceMetrics } from '../models/gateway';

// Metrics storage
const gatewayMetrics: GatewayMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  requestsPerSecond: 0,
  serviceMetrics: {},
};

const gatewayStartTime = Date.now();
let requestTimes: number[] = [];

/**
 * Record a request for metrics
 */
export function recordRequest(serviceName: string, responseTime: number, success: boolean): void {
  // Update gateway metrics
  gatewayMetrics.totalRequests++;

  if (success) {
    gatewayMetrics.successfulRequests++;
  } else {
    gatewayMetrics.failedRequests++;
  }

  // Track response times (keep last 1000 for average calculation)
  requestTimes.push(responseTime);
  if (requestTimes.length > 1000) {
    requestTimes = requestTimes.slice(-1000);
  }

  // Calculate average response time
  gatewayMetrics.averageResponseTime =
    requestTimes.reduce((sum, time) => sum + time, 0) / requestTimes.length;

  // Calculate requests per second (over last minute)
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const recentRequests = requestTimes.length; // Simplified calculation
  gatewayMetrics.requestsPerSecond = recentRequests / 60;

  // Update service-specific metrics
  if (!gatewayMetrics.serviceMetrics[serviceName]) {
    gatewayMetrics.serviceMetrics[serviceName] = {
      requests: 0,
      errors: 0,
      averageResponseTime: 0,
      lastRequestTime: '',
    };
  }

  const serviceMetric = gatewayMetrics.serviceMetrics[serviceName];
  serviceMetric.requests++;
  serviceMetric.lastRequestTime = new Date().toISOString();

  if (!success) {
    serviceMetric.errors++;
  }

  // Update service average response time (simplified)
  serviceMetric.averageResponseTime = (serviceMetric.averageResponseTime + responseTime) / 2;
}

/**
 * Get gateway metrics
 */
export const getMetrics = api(
  { method: 'GET', path: '/api/v1/metrics', expose: true },
  async (): Promise<MetricsResponse> => {
    return {
      gateway: { ...gatewayMetrics },
      timestamp: new Date().toISOString(),
      uptime: Date.now() - gatewayStartTime,
    };
  }
);

/**
 * Get metrics for a specific service
 */
export const getServiceMetrics = api(
  { method: 'GET', path: '/api/v1/metrics/:serviceName', expose: true },
  async ({ serviceName }: { serviceName: string }): Promise<ServiceMetrics | null> => {
    return gatewayMetrics.serviceMetrics[serviceName] || null;
  }
);

/**
 * Reset metrics (useful for testing)
 */
export const resetMetrics = api(
  { method: 'POST', path: '/api/v1/metrics/reset', expose: true },
  async (): Promise<{ reset: boolean; timestamp: string }> => {
    gatewayMetrics.totalRequests = 0;
    gatewayMetrics.successfulRequests = 0;
    gatewayMetrics.failedRequests = 0;
    gatewayMetrics.averageResponseTime = 0;
    gatewayMetrics.requestsPerSecond = 0;
    gatewayMetrics.serviceMetrics = {};
    requestTimes = [];

    return {
      reset: true,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Get metrics summary
 */
export const getMetricsSummary = api(
  { method: 'GET', path: '/api/v1/metrics/summary', expose: true },
  async (): Promise<{
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    activeServices: number;
  }> => {
    const successRate =
      gatewayMetrics.totalRequests > 0
        ? (gatewayMetrics.successfulRequests / gatewayMetrics.totalRequests) * 100
        : 0;

    return {
      totalRequests: gatewayMetrics.totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(gatewayMetrics.averageResponseTime * 100) / 100,
      requestsPerSecond: Math.round(gatewayMetrics.requestsPerSecond * 100) / 100,
      activeServices: Object.keys(gatewayMetrics.serviceMetrics).length,
    };
  }
);
