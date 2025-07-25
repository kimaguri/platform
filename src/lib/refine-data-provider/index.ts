/**
 * Simplx Data Provider для Refine
 * Работает исключительно через API Gateway
 * Новая архитектура: authProvider и dataProvider независимы, связь через localStorage
 */

// Основные провайдеры
export { createSimplxDataProvider, refreshTokenCache, destroyTokenCache } from './dataProvider';
export { createSimplxAuthProvider } from './authProvider';

// Типы
export type { DataProviderConfig } from './dataProvider';
export type { AuthConfig, AuthTokens, User } from './authProvider';

// Helper функции для работы с токенами (используются в dataProvider)
export { 
  getAuthTokens, 
  setAuthTokens, 
  clearAuthTokens, 
  getCurrentUser, 
  setCurrentUser 
} from './authProvider';

// Экспорт для совместимости с предыдущими версиями
export { createSimplxDataProvider as createDataProvider } from './dataProvider';
export { createSimplxAuthProvider as createAuthProvider } from './authProvider';
