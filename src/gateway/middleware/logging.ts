import { middleware } from 'encore.dev/api';
import { extractRequestInfo, getTenantId, getUserAgent, getClientIP } from '../utils/header-utils';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { recordRequest } from '../endpoints/metrics-endpoints';

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  tenantId?: string;
  userID?: string;
  userAgent?: string;
  ip?: string;
  duration: number;
  status: number;
  success: boolean;
  error?: string;
}

/**
 * Extract service name from API path
 */
function extractServiceName(path: string): string {
  if (path.includes('/users/') || path.includes('/user/')) return 'user-management';
  if (path.includes('/tenants/') || path.includes('/tenant/')) return 'tenant-management';
  if (path.includes('/content/')) return 'content-management';
  if (
    path.includes('/health') ||
    path.includes('/metrics') ||
    path.includes('/ready') ||
    path.includes('/live')
  )
    return 'api-gateway';
  return 'api-gateway'; // Default to gateway
}

/**
 * Logging Middleware
 * Logs all requests/responses with performance metrics
 *
 * This middleware runs last to capture complete request lifecycle
 */
export const loggingMiddleware = middleware(async (req, next) => {
  const startTime = Date.now();
  
  // Extract request information using utility
  const { headers, method, path } = extractRequestInfo(req);
  
  const tenantId = getTenantId(headers);
  const userAgent = getUserAgent(headers);
  const ip = getClientIP(headers);

  let authData: AuthData | undefined;
  try {
    authData = getAuthData() as AuthData;
  } catch {
    // Not authenticated
  }

  let response;
  let success = true;
  let error: string | undefined;

  try {
    response = await next(req);
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown error';
    throw err; // Re-throw the error
  } finally {
    const duration = Date.now() - startTime;

    // Create log entry
    const logEntry: RequestLog = {
      timestamp: new Date().toISOString(),
      method,
      path,
      tenantId,
      userID: authData?.userID,
      userAgent,
      ip,
      duration,
      status: response?.status || (success ? 200 : 500),
      success,
      error,
    };

    // Log the request
    if (success) {
      console.log('API Request:', JSON.stringify(logEntry));
    } else {
      console.error('API Error:', JSON.stringify(logEntry));
    }

    // Record metrics
    const serviceName = extractServiceName(path);
    recordRequest(serviceName, duration, success);

    // In production, send to monitoring service
    // await sendToMonitoringService(logEntry);
  }

  return response;
});
