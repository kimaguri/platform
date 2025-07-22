import { middleware } from 'encore.dev/api';
import { APIError } from 'encore.dev/api';
import type { AuthData } from './auth-handler';

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export const rateLimitMiddleware = middleware({ target: { auth: true } }, async (req, next) => {
  const authData = req.data.auth as AuthData;
  const key = `${authData?.tenantId}:${authData?.userID}`;
  const now = Date.now();

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    // Reset or initialize counter
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    current.count++;

    if (current.count > RATE_LIMIT_REQUESTS) {
      throw APIError.resourceExhausted('Rate limit exceeded. Please try again later.');
    }
  }

  return await next(req);
});

// Clear expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
