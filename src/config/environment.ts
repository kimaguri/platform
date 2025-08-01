// import { secret } from 'encore.dev/config'; // Удаляем, так как не используем Encore Cloud
import type { EnvironmentConfig } from './types';

// Environment variable definitions
export const environmentConfig: EnvironmentConfig = {
  required: ['ADMIN_SUPABASE_URL', 'ADMIN_SUPABASE_SERVICE_KEY', 'TENANT_CONFIG'],
  optional: [
    'NODE_ENV',
    'PORT',
    'HOST',
    'LOG_LEVEL',
    'ENABLE_METRICS',
    'ENABLE_CACHING',
    'RATE_LIMIT_REQUESTS',
    'RATE_LIMIT_WINDOW',
  ],
  validation: {
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'staging', 'production'],
    },
    PORT: {
      type: 'number',
      min: 1000,
      max: 65535,
    },
    LOG_LEVEL: {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
    },
    ENABLE_METRICS: {
      type: 'boolean',
    },
    ENABLE_CACHING: {
      type: 'boolean',
    },
    RATE_LIMIT_REQUESTS: {
      type: 'number',
      min: 1,
      max: 10000,
    },
    RATE_LIMIT_WINDOW: {
      type: 'number',
      min: 1000,
      max: 3600000,
    },
    ADMIN_SUPABASE_URL: {
      type: 'string',
      pattern: '^https?://.+',
    },
    TENANT_CONFIG: {
      type: 'json',
    },
  },
};

/**
 * Get environment variable with type conversion and validation
 */
export function getEnvVar<T = string>(
  key: string,
  defaultValue?: T,
  type: 'string' | 'number' | 'boolean' | 'json' = 'string'
): T {
  const value = process.env[key];

  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    if (environmentConfig.required.includes(key)) {
      throw new Error(`Required environment variable ${key} is not set`);
    }

    return undefined as T;
  }

  try {
    switch (type) {
      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error(`Environment variable ${key} is not a valid number`);
        }
        return numValue as T;

      case 'boolean':
        const boolValue = value.toLowerCase();
        if (!['true', 'false', '1', '0'].includes(boolValue)) {
          throw new Error(`Environment variable ${key} is not a valid boolean`);
        }
        return (boolValue === 'true' || boolValue === '1') as T;

      case 'json':
        return JSON.parse(value) as T;

      case 'string':
      default:
        return value as T;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse environment variable ${key}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of environmentConfig.required) {
    if (!process.env[key]) {
      errors.push(`Required environment variable ${key} is not set`);
    }
  }

  // Validate variable formats
  for (const [key, validation] of Object.entries(environmentConfig.validation)) {
    const value = process.env[key];

    if (!value) {
      continue; // Skip validation for unset optional variables
    }

    try {
      // Type validation
      switch (validation.type) {
        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`${key} must be a valid number`);
            continue;
          }

          if (validation.min !== undefined && numValue < validation.min) {
            errors.push(`${key} must be at least ${validation.min}`);
          }

          if (validation.max !== undefined && numValue > validation.max) {
            errors.push(`${key} must be at most ${validation.max}`);
          }
          break;

        case 'boolean':
          const boolValue = value.toLowerCase();
          if (!['true', 'false', '1', '0'].includes(boolValue)) {
            errors.push(`${key} must be a valid boolean (true/false/1/0)`);
          }
          break;

        case 'json':
          try {
            JSON.parse(value);
          } catch {
            errors.push(`${key} must be valid JSON`);
          }
          break;

        case 'string':
          if (validation.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
              errors.push(`${key} does not match required pattern: ${validation.pattern}`);
            }
          }

          if (validation.enum && !validation.enum.includes(value)) {
            errors.push(`${key} must be one of: ${validation.enum.join(', ')}`);
          }
          break;
      }
    } catch (error) {
      errors.push(
        `Failed to validate ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Check for unknown environment variables (warnings only)
  const knownVars = [...environmentConfig.required, ...environmentConfig.optional];
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('ENCORE_') || key.startsWith('NODE_')) {
      continue; // Skip system variables
    }

    if (!knownVars.includes(key)) {
      warnings.push(`Unknown environment variable: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
