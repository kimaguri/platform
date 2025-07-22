import { Service } from 'encore.dev/service';
import { performanceMiddleware, cachingMiddleware } from '../shared/middleware';

export default new Service('api-gateway', {
  middlewares: [performanceMiddleware, cachingMiddleware],
});
