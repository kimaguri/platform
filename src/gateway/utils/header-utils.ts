/**
 * Header Utilities for Encore Middleware
 * Provides unified interface for extracting headers from different request types
 */

/**
 * Standard header names used throughout the application
 */
export const STANDARD_HEADERS = {
  TENANT_ID: 'X-Tenant-ID',
  USER_AGENT: 'User-Agent',
  FORWARDED_FOR: 'X-Forwarded-For',
  REAL_IP: 'X-Real-IP',
  AUTHORIZATION: 'Authorization',
} as const;

/**
 * Request headers type (handles Node.js header variations)
 */
type RequestHeaders = Record<string, string | string[] | undefined>;

/**
 * Extracted request information
 */
export interface RequestInfo {
  headers: RequestHeaders;
  method: string;
  path: string;
}

/**
 * Helper function to normalize header value (handles string | string[] types)
 */
function normalizeHeaderValue(headerValue: string | string[] | undefined): string | undefined {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }
  return headerValue;
}

/**
 * Extract request information from Encore middleware request object
 * Handles different request types (typed, raw, fallback)
 */
export function extractRequestInfo(req: any): RequestInfo {
  let headers: RequestHeaders = {};
  let method = 'UNKNOWN';
  let path = '/';
  
  if (req.requestMeta) {
    // For typed endpoints - this is where headers are actually available!
    const meta = req.requestMeta as any;
    headers = meta.headers || {};
    method = meta.method || 'UNKNOWN';
    path = meta.path || '/';
  } else if (req.rawRequest) {
    // For raw endpoints
    headers = req.rawRequest.headers || {};
    method = req.rawRequest.method || 'UNKNOWN';
    path = req.rawRequest.url || '/';
  } else {
    // Fallback to req.data if available
    const data = req.data;
    headers = data?.headers || {};
    method = data?.method || 'UNKNOWN';
    path = data?.path || '/';
  }

  return { headers, method, path };
}

/**
 * Get normalized header value by name
 * Supports case-insensitive lookup for common headers
 */
export function getHeader(headers: RequestHeaders, headerName: string): string | undefined {
  // First try exact match
  const exactMatch = normalizeHeaderValue(headers[headerName]);
  if (exactMatch) {
    return exactMatch;
  }

  // For common headers, try case-insensitive lookup
  const lowerHeaderName = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerHeaderName) {
      return normalizeHeaderValue(value);
    }
  }

  return undefined;
}

/**
 * Get tenant ID from headers
 * Only supports the standard X-Tenant-ID format
 */
export function getTenantId(headers: RequestHeaders): string | undefined {
  return getHeader(headers, STANDARD_HEADERS.TENANT_ID);
}

/**
 * Get user agent from headers
 */
export function getUserAgent(headers: RequestHeaders): string | undefined {
  return getHeader(headers, STANDARD_HEADERS.USER_AGENT);
}

/**
 * Get client IP from headers (checks X-Forwarded-For and X-Real-IP)
 */
export function getClientIP(headers: RequestHeaders): string {
  const forwardedFor = getHeader(headers, STANDARD_HEADERS.FORWARDED_FOR);
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIP = getHeader(headers, STANDARD_HEADERS.REAL_IP);
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Get authorization header
 */
export function getAuthorizationHeader(headers: RequestHeaders): string | undefined {
  return getHeader(headers, STANDARD_HEADERS.AUTHORIZATION);
}

/**
 * Validate tenant ID format
 * Should be a valid UUID v4
 */
export function isValidTenantId(tenantId: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(tenantId);
}

/**
 * Extract and validate tenant ID from request
 * Throws error if tenant ID is missing or invalid
 */
export function extractAndValidateTenantId(req: any): string {
  const { headers } = extractRequestInfo(req);
  const tenantId = getTenantId(headers);
  
  if (!tenantId) {
    throw new Error(`${STANDARD_HEADERS.TENANT_ID} header is required`);
  }
  
  if (!isValidTenantId(tenantId)) {
    throw new Error(`Invalid ${STANDARD_HEADERS.TENANT_ID} format. Must be a valid UUID v4`);
  }
  
  return tenantId;
}
