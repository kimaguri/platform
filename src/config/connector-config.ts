import type { ConnectorConfig } from './types';
import { getEnvVar, getSecret } from './environment';

/**
 * Load connector configuration
 */
export async function loadConnectorConfig(): Promise<ConnectorConfig> {
  return {
    default: getEnvVar('DEFAULT_CONNECTOR', 'supabase'),

    connectors: {
      supabase: {
        enabled: getEnvVar('SUPABASE_CONNECTOR_ENABLED', true, 'boolean'),
        poolSize: getEnvVar('SUPABASE_POOL_SIZE', 10, 'number'),
        timeout: getEnvVar('SUPABASE_TIMEOUT', 30000, 'number'),
        retryAttempts: getEnvVar('SUPABASE_RETRIES', 3, 'number'),
        healthCheck: {
          enabled: getEnvVar('SUPABASE_HEALTH_CHECK', true, 'boolean'),
          interval: getEnvVar('SUPABASE_HEALTH_INTERVAL', 30000, 'number'),
        },
      },
      postgresql: {
        enabled: getEnvVar('POSTGRESQL_CONNECTOR_ENABLED', false, 'boolean'),
        poolSize: getEnvVar('POSTGRESQL_POOL_SIZE', 20, 'number'),
        timeout: getEnvVar('POSTGRESQL_TIMEOUT', 30000, 'number'),
        retryAttempts: getEnvVar('POSTGRESQL_RETRIES', 3, 'number'),
        healthCheck: {
          enabled: getEnvVar('POSTGRESQL_HEALTH_CHECK', true, 'boolean'),
          interval: getEnvVar('POSTGRESQL_HEALTH_INTERVAL', 30000, 'number'),
        },
      },
    },

    supabase: {
      adminUrl: await getSecret('ADMIN_SUPABASE_URL'),
      adminServiceKey: await getSecret('ADMIN_SUPABASE_SERVICE_KEY'),
      defaultOptions: {
        auth: {
          autoRefreshToken: getEnvVar('SUPABASE_AUTO_REFRESH', false, 'boolean'),
          persistSession: getEnvVar('SUPABASE_PERSIST_SESSION', false, 'boolean'),
        },
      },
    },
  };
}

/**
 * Get default connector configuration
 */
export function getDefaultConnectorConfig(): ConnectorConfig {
  return {
    default: 'supabase',

    connectors: {
      supabase: {
        enabled: true,
        poolSize: 10,
        timeout: 30000,
        retryAttempts: 3,
        healthCheck: {
          enabled: true,
          interval: 30000,
        },
      },
      postgresql: {
        enabled: false,
        poolSize: 20,
        timeout: 30000,
        retryAttempts: 3,
        healthCheck: {
          enabled: true,
          interval: 30000,
        },
      },
    },

    supabase: {
      adminUrl: 'https://localhost.supabase.co',
      adminServiceKey: 'dummy-key',
      defaultOptions: {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    },
  };
}

/**
 * Validate connector configuration
 */
export function validateConnectorConfig(config: ConnectorConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Default connector validation
  if (!config.default || config.default.trim().length === 0) {
    errors.push('Default connector must be specified');
  }

  if (!config.connectors[config.default]) {
    errors.push(`Default connector '${config.default}' is not configured`);
  }

  // Connector validation
  for (const [connectorName, connectorConfig] of Object.entries(config.connectors)) {
    const prefix = `Connector ${connectorName}`;

    if (connectorConfig.poolSize < 1 || connectorConfig.poolSize > 100) {
      errors.push(`${prefix}: pool size must be between 1 and 100`);
    }

    if (connectorConfig.timeout < 1000) {
      errors.push(`${prefix}: timeout must be at least 1000ms`);
    }

    if (connectorConfig.retryAttempts < 0 || connectorConfig.retryAttempts > 10) {
      errors.push(`${prefix}: retry attempts must be between 0 and 10`);
    }

    if (connectorConfig.healthCheck.enabled) {
      if (connectorConfig.healthCheck.interval < 1000) {
        errors.push(`${prefix}: health check interval must be at least 1000ms`);
      }
    }
  }

  // Supabase specific validation
  if (!config.supabase.adminUrl || !config.supabase.adminUrl.startsWith('http')) {
    errors.push('Supabase admin URL must be a valid HTTP URL');
  }

  if (!config.supabase.adminServiceKey || config.supabase.adminServiceKey.trim().length === 0) {
    errors.push('Supabase admin service key cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get connector configuration by type
 */
export function getConnectorConfigByType(
  connectorType: string,
  config?: ConnectorConfig
): ConnectorConfig['connectors'][string] | null {
  const connectorConfig = config || getDefaultConnectorConfig();
  return connectorConfig.connectors[connectorType] || null;
}

/**
 * Check if connector is enabled
 */
export function isConnectorEnabled(connectorType: string, config?: ConnectorConfig): boolean {
  const connector = getConnectorConfigByType(connectorType, config);
  return connector?.enabled || false;
}

/**
 * Get all enabled connectors
 */
export function getEnabledConnectors(config?: ConnectorConfig): string[] {
  const connectorConfig = config || getDefaultConnectorConfig();
  return Object.entries(connectorConfig.connectors)
    .filter(([, connector]) => connector.enabled)
    .map(([type]) => type);
}

/**
 * Merge connector configuration with defaults
 */
export function mergeConnectorConfig(config: Partial<ConnectorConfig>): ConnectorConfig {
  const defaults = getDefaultConnectorConfig();

  const mergedConnectors: ConnectorConfig['connectors'] = {};

  // Merge each connector configuration
  for (const connectorType of Object.keys(defaults.connectors)) {
    const defaultConnector = defaults.connectors[connectorType];
    const configConnector = config.connectors?.[connectorType];

    mergedConnectors[connectorType] = {
      ...defaultConnector,
      ...configConnector,
      healthCheck: {
        ...defaultConnector.healthCheck,
        ...configConnector?.healthCheck,
      },
    };
  }

  // Add any additional connectors from config
  if (config.connectors) {
    for (const [connectorType, connectorConfig] of Object.entries(config.connectors)) {
      if (!mergedConnectors[connectorType]) {
        mergedConnectors[connectorType] = {
          ...getDefaultConnectorConfig().connectors.supabase, // Use as template
          ...connectorConfig,
        };
      }
    }
  }

  return {
    default: config.default || defaults.default,
    connectors: mergedConnectors,
    supabase: {
      ...defaults.supabase,
      ...config.supabase,
      defaultOptions: {
        ...defaults.supabase.defaultOptions,
        ...config.supabase?.defaultOptions,
        auth: {
          ...defaults.supabase.defaultOptions.auth,
          ...config.supabase?.defaultOptions?.auth,
        },
      },
    },
  };
}

/**
 * Get Supabase connection config for tenant
 */
export async function getSupabaseConfigForTenant(
  tenantId: string,
  baseConfig?: ConnectorConfig
): Promise<{
  url: string;
  key: string;
  options: ConnectorConfig['supabase']['defaultOptions'];
}> {
  const config = baseConfig || (await loadConnectorConfig());

  // In a real implementation, this would fetch tenant-specific Supabase config
  // For now, we'll use the admin config as a placeholder
  return {
    url: config.supabase.adminUrl,
    key: config.supabase.adminServiceKey,
    options: config.supabase.defaultOptions,
  };
}
