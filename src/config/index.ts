// Main configuration module - unified configuration management
import type { PlatformConfig, ConfigLoadOptions, ConfigValidationResult } from './types';
import { loadAppConfig, validateAppConfig, mergeAppConfig } from './app-config';
import { loadServiceConfig, validateServiceConfig, mergeServiceConfig } from './service-config';
import {
  loadConnectorConfig,
  validateConnectorConfig,
  mergeConnectorConfig,
} from './connector-config';
import { validateEnvironment } from './environment';

// Re-export all types and individual modules
export * from './types';
export * from './app-config';
export * from './service-config';
export * from './connector-config';
export * from './environment';

// Global configuration cache
let configCache: PlatformConfig | null = null;
let configLoadTime: number = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load complete platform configuration
 */
export async function loadPlatformConfig(options: ConfigLoadOptions = {}): Promise<PlatformConfig> {
  const {
    environment = 'development',
    validateOnLoad = true,
    throwOnValidationError = true,
    enableDefaults = true,
  } = options;

  // Check cache
  const now = Date.now();
  if (configCache && now - configLoadTime < CONFIG_CACHE_TTL) {
    return configCache;
  }

  try {
    // Load all configuration modules
    const [appConfig, serviceConfig, connectorConfig] = await Promise.all([
      loadAppConfig(),
      loadServiceConfig(),
      loadConnectorConfig(),
    ]);

    const config: PlatformConfig = {
      app: appConfig,
      services: serviceConfig,
      connectors: connectorConfig,
      tenants: {
        caching: {
          enabled: true,
          ttl: 5 * 60 * 1000,
          maxSize: 1000,
        },
        validation: {
          enabled: true,
          strictMode: environment === 'production',
        },
        isolation: {
          enforceStrict: environment === 'production',
          allowCrossTenant: false,
        },
        limits: {
          maxTenantsPerRequest: 10,
          maxConfigSize: 1024 * 1024, // 1MB
        },
      },
      environment: {
        required: ['ADMIN_SUPABASE_URL', 'ADMIN_SUPABASE_SERVICE_KEY', 'TENANT_CONFIG'],
        optional: ['NODE_ENV', 'PORT', 'HOST', 'LOG_LEVEL'],
        validation: {},
      },
    };

    // Validate configuration if requested
    if (validateOnLoad) {
      const validation = await validatePlatformConfig(config);

      if (!validation.valid) {
        const errorMessage = `Configuration validation failed:\n${validation.errors.join('\n')}`;

        if (throwOnValidationError) {
          throw new Error(errorMessage);
        } else {
          console.error(errorMessage);
        }
      }

      if (validation.warnings.length > 0) {
        console.warn(`Configuration warnings:\n${validation.warnings.join('\n')}`);
      }
    }

    // Cache the configuration
    configCache = config;
    configLoadTime = now;

    return config;
  } catch (error) {
    throw new Error(
      `Failed to load platform configuration: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Validate complete platform configuration
 */
export async function validatePlatformConfig(
  config?: PlatformConfig
): Promise<ConfigValidationResult> {
  const platformConfig = config || (await loadPlatformConfig({ validateOnLoad: false }));

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate environment first
    const envValidation = validateEnvironment();
    errors.push(...envValidation.errors);
    warnings.push(...envValidation.warnings);

    // Validate each configuration module
    const appValidation = validateAppConfig(platformConfig.app);
    if (!appValidation.valid) {
      errors.push(...appValidation.errors.map((e) => `App Config: ${e}`));
    }

    const serviceValidation = validateServiceConfig(platformConfig.services);
    if (!serviceValidation.valid) {
      errors.push(...serviceValidation.errors.map((e) => `Service Config: ${e}`));
    }

    const connectorValidation = validateConnectorConfig(platformConfig.connectors);
    if (!connectorValidation.valid) {
      errors.push(...connectorValidation.errors.map((e) => `Connector Config: ${e}`));
    }

    // Cross-validation checks
    const defaultConnector = platformConfig.connectors.default;
    if (!platformConfig.connectors.connectors[defaultConnector]?.enabled) {
      errors.push(`Default connector '${defaultConnector}' is not enabled`);
    }

    // Service endpoint validation
    for (const [serviceName, serviceConfig] of Object.entries(platformConfig.services.services)) {
      if (serviceConfig.enabled) {
        const gatewayPrefix = platformConfig.services.gateway.prefix;
        const gatewayVersion = platformConfig.services.gateway.version;
        const expectedPath = `${gatewayPrefix}/${gatewayVersion}${serviceConfig.endpoint}`;

        // This is just an informational warning
        warnings.push(`Service '${serviceName}' will be accessible at ${expectedPath}`);
      }
    }
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get configuration value by path
 */
export async function getConfigValue<T = any>(path: string, defaultValue?: T): Promise<T> {
  const config = await loadPlatformConfig();

  const keys = path.split('.');
  let current: any = config;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue as T;
    }
  }

  return current as T;
}

/**
 * Reload configuration (clear cache)
 */
export function reloadConfiguration(): void {
  configCache = null;
  configLoadTime = 0;
}

/**
 * Get configuration health status
 */
export async function getConfigurationHealth(): Promise<{
  healthy: boolean;
  lastLoaded: string | null;
  cacheAge: number;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const validation = await validatePlatformConfig();
    issues.push(...validation.errors);

    return {
      healthy: validation.valid,
      lastLoaded: configLoadTime > 0 ? new Date(configLoadTime).toISOString() : null,
      cacheAge: configLoadTime > 0 ? Date.now() - configLoadTime : 0,
      issues,
    };
  } catch (error) {
    issues.push(
      `Configuration health check failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );

    return {
      healthy: false,
      lastLoaded: null,
      cacheAge: 0,
      issues,
    };
  }
}

/**
 * Create configuration with custom overrides
 */
export async function createCustomConfig(overrides: {
  app?: Partial<PlatformConfig['app']>;
  services?: Partial<PlatformConfig['services']>;
  connectors?: Partial<PlatformConfig['connectors']>;
  tenants?: Partial<PlatformConfig['tenants']>;
}): Promise<PlatformConfig> {
  const baseConfig = await loadPlatformConfig({ validateOnLoad: false });

  return {
    app: overrides.app ? mergeAppConfig({ ...baseConfig.app, ...overrides.app }) : baseConfig.app,
    services: overrides.services
      ? mergeServiceConfig({ ...baseConfig.services, ...overrides.services })
      : baseConfig.services,
    connectors: overrides.connectors
      ? mergeConnectorConfig({ ...baseConfig.connectors, ...overrides.connectors })
      : baseConfig.connectors,
    tenants: overrides.tenants
      ? { ...baseConfig.tenants, ...overrides.tenants }
      : baseConfig.tenants,
    environment: baseConfig.environment,
  };
}

/**
 * Export commonly used configuration getters
 */
export const config = {
  /**
   * Get app configuration
   */
  app: async () => (await loadPlatformConfig()).app,

  /**
   * Get service configuration
   */
  services: async () => (await loadPlatformConfig()).services,

  /**
   * Get connector configuration
   */
  connectors: async () => (await loadPlatformConfig()).connectors,

  /**
   * Get tenant system configuration
   */
  tenants: async () => (await loadPlatformConfig()).tenants,

  /**
   * Get full platform configuration
   */
  platform: loadPlatformConfig,

  /**
   * Validate current configuration
   */
  validate: validatePlatformConfig,

  /**
   * Reload configuration
   */
  reload: reloadConfiguration,

  /**
   * Get configuration health
   */
  health: getConfigurationHealth,
};
