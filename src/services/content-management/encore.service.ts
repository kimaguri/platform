import { Service } from 'encore.dev/service';
import {
  tenantValidationMiddleware,
  tenantConfigMiddleware,
  performanceMiddleware,
  cachingMiddleware,
} from '../../shared/middleware';

export default new Service('content-management', {
  middlewares: [
    performanceMiddleware,
    cachingMiddleware,
    tenantValidationMiddleware,
    tenantConfigMiddleware,
  ],
});
