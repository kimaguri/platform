import { Service } from 'encore.dev/service';
import {
  tenantValidationMiddleware,
  performanceMiddleware,
  cachingMiddleware,
} from '../../shared/middleware';

export default new Service('tenant-management', {
  middlewares: [performanceMiddleware, cachingMiddleware],
});
