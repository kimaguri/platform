import { Service } from 'encore.dev/service';
import {
  tenantValidationMiddleware,
  performanceMiddleware,
  cachingMiddleware,
} from '../../src/shared/middleware';

// Регистрация сервиса API Gateway с современными middleware
export default new Service('api-gateway', {
  middlewares: [performanceMiddleware, cachingMiddleware, tenantValidationMiddleware],
});
