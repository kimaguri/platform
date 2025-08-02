import { middleware } from 'encore.dev/api';

/**
 * CORS Middleware
 * Simple CORS middleware with debug logging
 */
export const corsMiddleware = middleware(async (req, next) => {
  // Log incoming request details for debugging CORS issues
  console.log('CORS Middleware - Incoming request:', {
    // Using type assertion to avoid TypeScript errors
    method: (req.requestMeta as any)?.method,
    path: (req.requestMeta as any)?.path,
    origin: (req.requestMeta as any)?.headers?.origin,
  });
  
  // Let Encore handle CORS configuration via encore.app file
  // This middleware just passes through requests
  const response = await next(req);
  
  // Log outgoing response details for debugging CORS issues
  console.log('CORS Middleware - Outgoing response:', {
    statusCode: (response as any)?.status,
    headers: (response as any)?.header ? 'Headers present' : 'No headers',
  });
  
  return response;
});
