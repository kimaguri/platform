import type { AppConfig } from './types';
import { getEnvVar, loadEnvironmentDefaults } from './environment';

/**
 * Load application configuration
 */
export function loadAppConfig(): AppConfig {
  const envDefaults = loadEnvironmentDefaults();

  return {
    environment: envDefaults.NODE_ENV as 'development' | 'staging' | 'production',
    port: envDefaults.PORT,
    host: envDefaults.HOST,

    cors: {
      origins: getEnvVar(
        'CORS_ORIGINS',
        ['http://localhost:3000', 'http://localhost:5173'],
        'json'
      ),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID', 'X-API-Key'],
      credentials: true,
    },

    logging: {
      level: envDefaults.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error',
      format: getEnvVar('LOG_FORMAT', 'json') as 'json' | 'text',
      enableConsole: getEnvVar('ENABLE_CONSOLE_LOGGING', true, 'boolean'),
    },

    performance: {
      requestTimeout: getEnvVar('REQUEST_TIMEOUT', 30000, 'number'),
      maxConnections: getEnvVar('MAX_CONNECTIONS', 1000, 'number'),
      rateLimitWindow: envDefaults.RATE_LIMIT_WINDOW,
      rateLimitRequests: envDefaults.RATE_LIMIT_REQUESTS,
    },

    features: {
      enableMetrics: envDefaults.ENABLE_METRICS,
      enableHealthChecks: getEnvVar('ENABLE_HEALTH_CHECKS', true, 'boolean'),
      enableCaching: envDefaults.ENABLE_CACHING,
      enableRateLimiting: getEnvVar('ENABLE_RATE_LIMITING', true, 'boolean'),
    },
  };
}

/**
 * Get default application configuration
 */
export function getDefaultAppConfig(): AppConfig {
  return {
    environment: 'development',
    port: 4000,
    host: '0.0.0.0',

    cors: {
      origins: ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID', 'X-API-Key'],
      credentials: true,
    },

    logging: {
      level: 'debug',
      format: 'json',
      enableConsole: true,
    },

    performance: {
      requestTimeout: 30000,
      maxConnections: 1000,
      rateLimitWindow: 60000,
      rateLimitRequests: 100,
    },

    features: {
      enableMetrics: true,
      enableHealthChecks: true,
      enableCaching: true,
      enableRateLimiting: true,
    },
  };
}

/**
 * Validate application configuration
 */
export function validateAppConfig(config: AppConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Environment validation
  if (!['development', 'staging', 'production'].includes(config.environment)) {
    errors.push('Invalid environment. Must be development, staging, or production');
  }

  // Port validation
  if (config.port < 1000 || config.port > 65535) {
    errors.push('Port must be between 1000 and 65535');
  }

  // Host validation
  if (!config.host || config.host.trim().length === 0) {
    errors.push('Host cannot be empty');
  }

  // CORS origins validation
  if (!Array.isArray(config.cors.origins) || config.cors.origins.length === 0) {
    errors.push('CORS origins must be a non-empty array');
  }

  // Logging level validation
  if (!['debug', 'info', 'warn', 'error'].includes(config.logging.level)) {
    errors.push('Invalid logging level. Must be debug, info, warn, or error');
  }

  // Performance validation
  if (config.performance.requestTimeout < 1000) {
    errors.push('Request timeout must be at least 1000ms');
  }

  if (config.performance.maxConnections < 1) {
    errors.push('Max connections must be at least 1');
  }

  if (config.performance.rateLimitWindow < 1000) {
    errors.push('Rate limit window must be at least 1000ms');
  }

  if (config.performance.rateLimitRequests < 1) {
    errors.push('Rate limit requests must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge configuration with defaults
 */
export function mergeAppConfig(config: Partial<AppConfig>): AppConfig {
  const defaults = getDefaultAppConfig();

  return {
    ...defaults,
    ...config,
    cors: {
      ...defaults.cors,
      ...config.cors,
    },
    logging: {
      ...defaults.logging,
      ...config.logging,
    },
    performance: {
      ...defaults.performance,
      ...config.performance,
    },
    features: {
      ...defaults.features,
      ...config.features,
    },
  };
}
