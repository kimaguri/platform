import type { ServiceConfig } from './types';
import { getEnvVar } from './environment';

/**
 * Load service configuration
 */
export function loadServiceConfig(): ServiceConfig {
  return {
    services: {
      'tenant-management': {
        enabled: getEnvVar('TENANT_SERVICE_ENABLED', true, 'boolean'),
        endpoint: getEnvVar('TENANT_SERVICE_ENDPOINT', '/tenants'),
        healthEndpoint: getEnvVar('TENANT_SERVICE_HEALTH', '/tenants/health'),
        timeout: getEnvVar('TENANT_SERVICE_TIMEOUT', 30000, 'number'),
        retryAttempts: getEnvVar('TENANT_SERVICE_RETRIES', 3, 'number'),
        circuitBreaker: {
          enabled: getEnvVar('TENANT_SERVICE_CB_ENABLED', true, 'boolean'),
          threshold: getEnvVar('TENANT_SERVICE_CB_THRESHOLD', 5, 'number'),
          timeout: getEnvVar('TENANT_SERVICE_CB_TIMEOUT', 60000, 'number'),
        },
      },
      'user-management': {
        enabled: getEnvVar('USER_SERVICE_ENABLED', true, 'boolean'),
        endpoint: getEnvVar('USER_SERVICE_ENDPOINT', '/users'),
        healthEndpoint: getEnvVar('USER_SERVICE_HEALTH', '/users/health'),
        timeout: getEnvVar('USER_SERVICE_TIMEOUT', 30000, 'number'),
        retryAttempts: getEnvVar('USER_SERVICE_RETRIES', 3, 'number'),
        circuitBreaker: {
          enabled: getEnvVar('USER_SERVICE_CB_ENABLED', true, 'boolean'),
          threshold: getEnvVar('USER_SERVICE_CB_THRESHOLD', 5, 'number'),
          timeout: getEnvVar('USER_SERVICE_CB_TIMEOUT', 60000, 'number'),
        },
      },
      'content-management': {
        enabled: getEnvVar('CONTENT_SERVICE_ENABLED', true, 'boolean'),
        endpoint: getEnvVar('CONTENT_SERVICE_ENDPOINT', '/entities'),
        healthEndpoint: getEnvVar('CONTENT_SERVICE_HEALTH', '/entities/health'),
        timeout: getEnvVar('CONTENT_SERVICE_TIMEOUT', 30000, 'number'),
        retryAttempts: getEnvVar('CONTENT_SERVICE_RETRIES', 3, 'number'),
        circuitBreaker: {
          enabled: getEnvVar('CONTENT_SERVICE_CB_ENABLED', true, 'boolean'),
          threshold: getEnvVar('CONTENT_SERVICE_CB_THRESHOLD', 5, 'number'),
          timeout: getEnvVar('CONTENT_SERVICE_CB_TIMEOUT', 60000, 'number'),
        },
      },
    },
    gateway: {
      prefix: getEnvVar('GATEWAY_PREFIX', '/api'),
      version: getEnvVar('GATEWAY_VERSION', 'v1'),
      enableProxy: getEnvVar('GATEWAY_ENABLE_PROXY', true, 'boolean'),
      enableLoadBalancing: getEnvVar('GATEWAY_ENABLE_LB', false, 'boolean'),
    },
  };
}

/**
 * Get default service configuration
 */
export function getDefaultServiceConfig(): ServiceConfig {
  return {
    services: {
      'tenant-management': {
        enabled: true,
        endpoint: '/tenants',
        healthEndpoint: '/tenants/health',
        timeout: 30000,
        retryAttempts: 3,
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
      },
      'user-management': {
        enabled: true,
        endpoint: '/users',
        healthEndpoint: '/users/health',
        timeout: 30000,
        retryAttempts: 3,
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
      },
      'content-management': {
        enabled: true,
        endpoint: '/entities',
        healthEndpoint: '/entities/health',
        timeout: 30000,
        retryAttempts: 3,
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
      },
    },
    gateway: {
      prefix: '/api',
      version: 'v1',
      enableProxy: true,
      enableLoadBalancing: false,
    },
  };
}

/**
 * Validate service configuration
 */
export function validateServiceConfig(config: ServiceConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Gateway validation
  if (!config.gateway.prefix || !config.gateway.prefix.startsWith('/')) {
    errors.push('Gateway prefix must start with /');
  }

  if (!config.gateway.version || config.gateway.version.trim().length === 0) {
    errors.push('Gateway version cannot be empty');
  }

  // Service validation
  for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
    const prefix = `Service ${serviceName}`;

    if (!serviceConfig.endpoint || !serviceConfig.endpoint.startsWith('/')) {
      errors.push(`${prefix}: endpoint must start with /`);
    }

    if (!serviceConfig.healthEndpoint || !serviceConfig.healthEndpoint.startsWith('/')) {
      errors.push(`${prefix}: health endpoint must start with /`);
    }

    if (serviceConfig.timeout < 1000) {
      errors.push(`${prefix}: timeout must be at least 1000ms`);
    }

    if (serviceConfig.retryAttempts < 0 || serviceConfig.retryAttempts > 10) {
      errors.push(`${prefix}: retry attempts must be between 0 and 10`);
    }

    // Circuit breaker validation
    if (serviceConfig.circuitBreaker.enabled) {
      if (serviceConfig.circuitBreaker.threshold < 1) {
        errors.push(`${prefix}: circuit breaker threshold must be at least 1`);
      }

      if (serviceConfig.circuitBreaker.timeout < 1000) {
        errors.push(`${prefix}: circuit breaker timeout must be at least 1000ms`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get service configuration by name
 */
export function getServiceConfig(
  serviceName: string,
  config?: ServiceConfig
): ServiceConfig['services'][string] | null {
  const serviceConfig = config || loadServiceConfig();
  return serviceConfig.services[serviceName] || null;
}

/**
 * Check if service is enabled
 */
export function isServiceEnabled(serviceName: string, config?: ServiceConfig): boolean {
  const service = getServiceConfig(serviceName, config);
  return service?.enabled || false;
}

/**
 * Get all enabled services
 */
export function getEnabledServices(config?: ServiceConfig): string[] {
  const serviceConfig = config || loadServiceConfig();
  return Object.entries(serviceConfig.services)
    .filter(([, service]) => service.enabled)
    .map(([name]) => name);
}

/**
 * Merge service configuration with defaults
 */
export function mergeServiceConfig(config: Partial<ServiceConfig>): ServiceConfig {
  const defaults = getDefaultServiceConfig();

  const mergedServices: ServiceConfig['services'] = {};

  // Merge each service configuration
  for (const serviceName of Object.keys(defaults.services)) {
    const defaultService = defaults.services[serviceName];
    const configService = config.services?.[serviceName];

    mergedServices[serviceName] = {
      ...defaultService,
      ...configService,
      enabled: configService?.enabled ?? defaultService?.enabled ?? true,
      endpoint: configService?.endpoint ?? defaultService?.endpoint ?? '',
      healthEndpoint: configService?.healthEndpoint ?? defaultService?.healthEndpoint ?? '/health',
      timeout: configService?.timeout ?? defaultService?.timeout ?? 30000,
      retryAttempts: configService?.retryAttempts ?? defaultService?.retryAttempts ?? 3,
      circuitBreaker: {
        enabled:
          configService?.circuitBreaker?.enabled ??
          defaultService?.circuitBreaker?.enabled ??
          false,
        threshold:
          configService?.circuitBreaker?.threshold ??
          defaultService?.circuitBreaker?.threshold ??
          5,
        timeout:
          configService?.circuitBreaker?.timeout ??
          defaultService?.circuitBreaker?.timeout ??
          60000,
      },
    };
  }

  // Add any additional services from config
  if (config.services) {
    for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
      if (!mergedServices[serviceName]) {
        mergedServices[serviceName] = {
          ...getDefaultServiceConfig().services['tenant-management'], // Use as template
          ...serviceConfig,
        };
      }
    }
  }

  return {
    services: mergedServices,
    gateway: {
      ...defaults.gateway,
      ...config.gateway,
    },
  };
}
