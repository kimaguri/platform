import { Service } from 'encore.dev/service';
import {
  tenantValidationMiddleware,
  tenantConfigMiddleware,
  performanceMiddleware,
  cachingMiddleware,
  rateLimitMiddleware,
} from '../../shared/middleware';

export default new Service('user-management', {
  middlewares: [
    performanceMiddleware,
    cachingMiddleware,
    tenantValidationMiddleware,
    tenantConfigMiddleware,
    rateLimitMiddleware,
  ],
});
