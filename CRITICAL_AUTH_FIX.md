# 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ АУТЕНТИФИКАЦИИ

## ПРОБЛЕМА: Мы использовали Go подход в TypeScript проекте

### ❌ ЧТО ДЕЛАЛИ НЕПРАВИЛЬНО:

1. Пытались создать `//encore:authhandler` (это только для Go!)
2. Создавали отдельную функцию аутентификации
3. Думали, что нужен отдельный Gateway класс

### ✅ КАК ПРАВИЛЬНО В ENCORE.TS:

#### 1. Аутентификация через `auth: true` в API опциях:

```typescript
// src/gateway/auth.ts
import { api } from 'encore.dev/api';
import { APIError } from 'encore.dev/api';

// Интерфейс для аутентифицированного пользователя
export interface AuthUser {
  id: string;
  tenantId: string;
  email?: string;
  role?: string;
}

// ПУБЛИЧНЫЙ API для логина (без аутентификации)
export const login = api(
  { method: 'POST', path: '/auth/login', expose: true },
  async (params: { email: string; password: string }): Promise<{ token: string }> => {
    // Проверяем credentials через Supabase
    // Возвращаем JWT токен
    return { token: 'jwt-token' };
  }
);

// ЗАЩИЩЁННЫЙ API (с аутентификацией)
export const getProfile = api(
  {
    method: 'GET',
    path: '/auth/profile',
    expose: true,
    auth: true, // ← ВОТ КАК ВКЛЮЧАЕТСЯ АУТЕНТИФИКАЦИЯ
  },
  async (): Promise<AuthUser> => {
    // Encore.ts автоматически проверил токен
    // Пользователь уже аутентифицирован
    return {
      id: 'user-id',
      tenantId: 'tenant-id',
      email: 'user@example.com',
    };
  }
);
```

#### 2. Middleware для извлечения данных пользователя:

```typescript
// src/gateway/middleware/auth-middleware.ts
import { middleware } from 'encore.dev/api';

// Middleware для обработки аутентификации
export const authMiddleware = middleware(
  { target: { auth: true } }, // Применяется только к auth: true endpoints
  async (req, next) => {
    // Извлекаем данные пользователя из JWT токена
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      throw new APIError(401, 'No token provided');
    }

    // Проверяем и декодируем JWT
    const userData = await validateJWT(token);

    // Добавляем данные пользователя в контекст
    req.user = userData;

    // Продолжаем выполнение
    const response = await next(req);
    return response;
  }
);
```

#### 3. Обновлённая структура Gateway:

```typescript
// src/gateway/index.ts
import { Service } from 'encore.dev/service';
import { authMiddleware } from './middleware/auth-middleware';

// Определяем сервис Gateway с middleware
export default new Service('gateway', {
  middlewares: [authMiddleware],
});

// Экспортируем все API endpoints
export * from './auth';
export * from './tenants';
export * from './users';
```

## ИСПРАВЛЕНИЯ В НАШЕМ ПРОЕКТЕ

### 1. Удалить неправильные файлы:

- `src/shared/middleware/auth/auth-handler.ts` (неправильный подход)
- Любые попытки создать `//encore:authhandler`

### 2. Обновить API Gateway:

- Использовать `auth: true` в опциях API
- Создать правильный middleware
- Убрать самодельную систему аутентификации

### 3. Обновить encore.app:

- Убрать ссылки на несуществующий authHandler
- Настроить правильную структуру сервисов

## ВЫВОДЫ

1. **Encore.ts ≠ Encore.go** - разные подходы к аутентификации
2. **TypeScript версия проще** - не нужен отдельный authHandler
3. **Наш Gateway был правильным** - просто нужно исправить аутентификацию
4. **Middleware подход корректный** - но должен работать с `auth: true`

## СЛЕДУЮЩИЕ ШАГИ

1. Исправить аутентификацию в Gateway
2. Удалить неправильные файлы
3. Обновить encore.app конфигурацию
4. Протестировать новый подход
