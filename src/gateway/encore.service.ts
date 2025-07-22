import { Service } from 'encore.dev/service';
import { performanceMiddleware, cachingMiddleware } from '../shared/middleware';
import { gateway } from '../shared/middleware/auth/auth-handler';

// Export the gateway with auth handler
export { gateway };

export default new Service('api-gateway', {
  middlewares: [performanceMiddleware, cachingMiddleware],
});
