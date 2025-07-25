import { middleware } from 'encore.dev/api';
import { APIError } from 'encore.dev/api';
import { extractRequestInfo, getTenantId, getClientIP } from '../utils/header-utils';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';

// Simple in-memory rate limiter (in production use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Rate limit configurations
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  tenant: { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 requests per minute per tenant
  user: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute per user
  ip: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 requests per minute per IP
};

/**
 * Rate Limiting Middleware
 * Applies rate limits based on tenant, user, and IP
 *
 * This middleware runs after auth to have access to user data
 */
export const rateLimitingMiddleware = middleware(async (req, next) => {
  const now = Date.now();

  // Extract request information using utility
  const { headers } = extractRequestInfo(req);

  // Get identifiers for rate limiting
  const tenantId = getTenantId(headers);
  const clientIP = getClientIP(headers);

  let userID: string | undefined;
  try {
    const authData = getAuthData() as AuthData;
    userID = authData?.userID;
  } catch {
    // Not authenticated - use IP-based rate limiting only
  }

  // Check rate limits in order: IP -> Tenant -> User
  const checks = [
    { key: `ip:${clientIP}`, config: RATE_LIMITS.ip },
    ...(tenantId ? [{ key: `tenant:${tenantId}`, config: RATE_LIMITS.tenant }] : []),
    ...(userID ? [{ key: `user:${userID}`, config: RATE_LIMITS.user }] : []),
  ];

  for (const { key, config } of checks) {
    if (!config) continue;

    const bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetTime) {
      // Reset or create new bucket
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
    } else {
      // Increment existing bucket
      bucket.count++;

      if (bucket.count > config.maxRequests) {
        const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
        throw APIError.resourceExhausted(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        );
      }
    }
  }

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance
    cleanupExpiredEntries();
  }

  return await next(req);
});

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}
