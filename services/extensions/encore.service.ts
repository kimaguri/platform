import { Service } from 'encore.dev/service';
import {
  tenantValidationMiddleware,
  performanceMiddleware,
  cachingMiddleware,
  tenantConfigMiddleware,
} from '../../src/shared/middleware';

// Регистрация сервиса Extensions с современными middleware
export default new Service('extensions', {
  middlewares: [
    performanceMiddleware,
    cachingMiddleware,
    tenantConfigMiddleware,
    tenantValidationMiddleware,
  ],
});
