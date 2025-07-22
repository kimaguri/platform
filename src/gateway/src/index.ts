// API Gateway Service
// Экспорт всех эндпоинтов

// Health checks
export * from './handlers/health';

// Metrics
export * from './handlers/metrics';

// Routes
export * from '../routing/tenant-routes';
export * from '../routing/user-routes';
export * from '../routing/content-routes';
