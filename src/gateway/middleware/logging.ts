import { middleware } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';

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
 * Logging Middleware
 * Logs all requests/responses with performance metrics
 *
 * This middleware runs last to capture complete request lifecycle
 */
export const loggingMiddleware = middleware(async (req, next) => {
  const startTime = Date.now();
  const data = req.data;

  // Extract request information
  const method = data.method || 'UNKNOWN';
  const path = data.path || '/';
  const tenantId = data.headers?.['x-tenant-id'] || data.headers?.['X-Tenant-ID'];
  const userAgent = data.headers?.['user-agent'];
  const ip = data.headers?.['x-forwarded-for'] || data.headers?.['x-real-ip'] || 'unknown';

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

    // In production, send to monitoring service
    // await sendToMonitoringService(logEntry);
  }

  return response;
});
