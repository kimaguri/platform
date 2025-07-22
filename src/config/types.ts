// Configuration type definitions

export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  port: number;
  host: string;
  cors: {
    origins: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    enableConsole: boolean;
  };
  performance: {
    requestTimeout: number;
    maxConnections: number;
    rateLimitWindow: number;
    rateLimitRequests: number;
  };
  features: {
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    enableCaching: boolean;
    enableRateLimiting: boolean;
  };
}

export interface ServiceConfig {
  services: {
    [serviceName: string]: {
      enabled: boolean;
      endpoint: string;
      healthEndpoint: string;
      timeout: number;
      retryAttempts: number;
      circuitBreaker: {
        enabled: boolean;
        threshold: number;
        timeout: number;
      };
    };
  };
  gateway: {
    prefix: string;
    version: string;
    enableProxy: boolean;
    enableLoadBalancing: boolean;
  };
}

export interface ConnectorConfig {
  default: string; // Default connector type
  connectors: {
    [connectorType: string]: {
      enabled: boolean;
      poolSize: number;
      timeout: number;
      retryAttempts: number;
      healthCheck: {
        enabled: boolean;
        interval: number;
      };
    };
  };
  supabase: {
    adminUrl: string;
    adminServiceKey: string;
    defaultOptions: {
      auth: {
        autoRefreshToken: boolean;
        persistSession: boolean;
      };
    };
  };
}

export interface TenantConfigSystem {
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  validation: {
    enabled: boolean;
    strictMode: boolean;
  };
  isolation: {
    enforceStrict: boolean;
    allowCrossTenant: boolean;
  };
  limits: {
    maxTenantsPerRequest: number;
    maxConfigSize: number;
  };
}

export interface EnvironmentConfig {
  required: string[];
  optional: string[];
  validation: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'json';
      pattern?: string;
      min?: number;
      max?: number;
      enum?: string[];
    };
  };
}

export interface ValidationSchema {
  app: Partial<AppConfig>;
  services: Partial<ServiceConfig>;
  connectors: Partial<ConnectorConfig>;
  tenants: Partial<TenantConfigSystem>;
}

// Unified configuration interface
export interface PlatformConfig {
  app: AppConfig;
  services: ServiceConfig;
  connectors: ConnectorConfig;
  tenants: TenantConfigSystem;
  environment: EnvironmentConfig;
}

// Configuration validation result
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration loading options
export interface ConfigLoadOptions {
  environment?: string;
  validateOnLoad?: boolean;
  throwOnValidationError?: boolean;
  enableDefaults?: boolean;
}
