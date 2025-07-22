// API Gateway models and types

export interface ServiceRoute {
  serviceName: string;
  basePath: string;
  version?: string;
  healthEndpoint?: string;
}

export interface GatewayConfig {
  services: ServiceRoute[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origins: string[];
    methods: string[];
    headers: string[];
  };
  monitoring: {
    metricsEnabled: boolean;
    healthCheckInterval: number;
  };
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export interface GatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  serviceMetrics: Record<string, ServiceMetrics>;
}

export interface ServiceMetrics {
  requests: number;
  errors: number;
  averageResponseTime: number;
  lastRequestTime: string;
}

export interface ProxyRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

export interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
}

export interface RouteMatch {
  service: ServiceRoute;
  targetPath: string;
  pathParams: Record<string, string>;
}

// Error types
export interface GatewayError {
  code: string;
  message: string;
  service?: string;
  statusCode: number;
  details?: any;
}

// Request context
export interface GatewayRequestContext {
  requestId: string;
  startTime: number;
  route?: RouteMatch;
  authData?: any;
  tenantId?: string;
  userId?: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: string;
  uptime: number;
}

// Metrics response
export interface MetricsResponse {
  gateway: GatewayMetrics;
  timestamp: string;
  uptime: number;
}
