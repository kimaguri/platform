import { middleware } from 'encore.dev/api';

/**
 * CORS Middleware
 * Handles CORS headers for all responses
 *
 * Note: Encore.ts handles CORS automatically, but this middleware
 * provides additional custom CORS configuration if needed
 */
export const corsMiddleware = middleware(async (req, next) => {
  // Continue to next middleware first
  const response = await next(req);

  // Add custom CORS headers if needed
  // Encore.ts handles basic CORS automatically
  // This middleware can be used for additional customization

  return response;
});
