# Simplx Data Provider для Refine

> **Новая архитектура**: Работает исключительно через API Gateway с in-memory кешированием токенов (аналог supabase-js)

Этот пакет предоставляет `authProvider` и `dataProvider` для [Refine](https://refine.dev), которые работают с Simplx Platform через API Gateway.

## ✨ Ключевые особенности

- 🚀 **In-memory кеширование токенов** - быстрый доступ без постоянных обращений к localStorage
- 🔄 **Автоматическая синхронизация** - подписка на события изменения токенов
- 🎯 **Функциональный подход** - современный код без классов, использует замыкания
- 🔐 **Автоматический refresh токенов** - бесшовное обновление истекших токенов
- 🏗️ **Best practices Refine** - полное соответствие рекомендациям Refine

## Архитектура

### Принципы

1. **Разделение ответственности**:
   - `authProvider` управляет всей логикой аутентификации (login, logout, check, identity, permissions)
   - `dataProvider` управляет CRUD операциями и автоматически подставляет токены

2. **Независимость провайдеров**:
   - AuthProvider и DataProvider не импортируют функции друг от друга
   - Связь осуществляется через localStorage + in-memory кеш
   - Соответствует best practices Refine

3. **API Gateway Only**:
   - Все запросы идут через API Gateway
   - Supabase используется только на бэкенде
   - Единая точка входа для всех операций

4. **Производительность**:
   - Токены кешируются в памяти (аналог supabase-js)
   - TTL кеша: 5 секунд
   - Автоматическое обновление при изменениях в localStorage

## Быстрый старт

### 1. Настройка Auth Provider

```typescript
import { createSimplxAuthProvider } from '@/lib/refine-data-provider';

const authProvider = createSimplxAuthProvider({
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:4000',
});
```

### 2. Настройка Data Provider с in-memory кешированием

```typescript
import { createSimplxDataProvider } from '@/lib/refine-data-provider';

const dataProvider = createSimplxDataProvider({
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:4000',
});
```

> 🚀 **Производительность**: DataProvider автоматически кеширует JWT токены и tenantId в памяти, избегая повторных обращений к localStorage при каждом запросе (аналогично supabase-js)

### 3. Использование с Refine

```typescript
import { Refine } from '@refinedev/core';
import { createSimplxAuthProvider, createSimplxDataProvider } from '@/lib/refine-data-provider';

const authProvider = createSimplxAuthProvider({
  apiUrl: process.env.REACT_APP_API_URL!,
});

const dataProvider = createSimplxDataProvider({
  apiUrl: process.env.REACT_APP_API_URL!,
});

function App() {
  return (
    <Refine
      authProvider={authProvider}
      dataProvider={dataProvider}
      resources={[
        {
          name: 'leads',
          list: '/leads',
          create: '/leads/create',
          edit: '/leads/edit/:id',
          show: '/leads/show/:id',
        },
        {
          name: 'contacts',
          list: '/contacts',
          create: '/contacts/create',
          edit: '/contacts/edit/:id',
          show: '/contacts/show/:id',
        },
      ]}
    >
      {/* Ваши компоненты */}
    </Refine>
  );
}
```

## 🚀 In-Memory Кеширование Токенов

### Как это работает (аналогично supabase-js)

```typescript
// ❌ Медленно: обращение к localStorage при каждом запросе
const token = localStorage.getItem('auth.token');
const tenantId = localStorage.getItem('auth.tenantId');

// ✅ Быстро: токены кешируются в памяти
const { token, tenantId } = tokenCache.getTokens(); // Мгновенный доступ!
```

### Автоматическая синхронизация

- **TTL кеша**: 5 секунд (настраивается)
- **Storage Events**: Автоматическое обновление при изменениях в localStorage
- **Функциональный подход**: Использует замыкания вместо классов

### Управление кешем

```typescript
import { refreshTokenCache, destroyTokenCache } from '@/lib/refine-data-provider';

// Принудительное обновление кеша (например, после login)
refreshTokenCache();

// Очистка кеша (например, при размонтировании компонента)
destroyTokenCache();
```

### Преимущества производительности

| Операция | Без кеша | С кешем |
|----------|----------|----------|
| Получение токена | ~1-2ms (localStorage) | ~0.01ms (память) |
| 100 запросов подряд | ~100-200ms | ~1ms |
| Синхронизация | Ручная | Автоматическая |

## Особенности

### Автоматическая подстановка токенов

Data Provider автоматически добавляет в каждый запрос:
- `Authorization: Bearer <token>` - JWT токен
- `X-Tenant-ID: <tenantId>` - ID тенанта (если есть)

### Обработка ошибок аутентификации

Auth Provider автоматически:
- Обновляет токены при истечении срока действия
- Перенаправляет на страницу входа при ошибках 401/403
- Очищает токены при выходе

### Поддержка мультитенантности

```typescript
// При входе можно указать tenantId
await authProvider.login({
  email: 'user@example.com',
  password: 'password',
  tenantId: 'tenant-123',
});

// Он автоматически будет добавлен в заголовки всех запросов
```

## API Endpoints

### Auth Provider ожидает следующие endpoints:

#### POST /auth/login
```json
// Request
{
  "email": "user@example.com",
  "password": "password",
  "tenantId": "tenant-123" // опционально
}

// Response
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token", // опционально
  "expiresAt": 1234567890, // unix timestamp
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "tenantId": "tenant-123"
  }
}
```

#### POST /auth/logout
```json
// Headers: Authorization: Bearer <token>
// Response: любой (игнорируется)
```

#### GET /auth/check
```json
// Headers: Authorization: Bearer <token>
// Response: любой (проверяется только статус 200)
```

#### GET /auth/me
```json
// Headers: Authorization: Bearer <token>
// Response
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "tenantId": "tenant-123",
  "roles": ["admin", "user"]
}
```

#### POST /auth/refresh
```json
// Request
{
  "refreshToken": "refresh-token"
}

// Response
{
  "accessToken": "new-jwt-token",
  "refreshToken": "new-refresh-token", // опционально
  "expiresAt": 1234567890
}
```

### Data Provider работает с REST API:

- `GET /{resource}` - список записей
- `GET /{resource}/{id}` - одна запись
- `POST /{resource}` - создание
- `PUT /{resource}/{id}` - обновление
- `DELETE /{resource}/{id}` - удаление
- `POST /{resource}/bulk` - массовые операции
- `PUT /{resource}/bulk` - массовое обновление
- `DELETE /{resource}/bulk` - массовое удаление

## Параметры запросов

### Фильтрация
```
GET /leads?name=John&status__in=active,pending&created_at__gte=2024-01-01
```

### Сортировка
```
GET /leads?order_by=created_at,-name  // по created_at ASC, потом по name DESC
```

### Пагинация
```
GET /leads?page=1&limit=20
```

### Выборка полей
```
GET /leads?fields=id,name,email,status
```

## Переменные окружения

```env
REACT_APP_API_URL=http://localhost:4000
```

## Миграция с предыдущей версии

Если у вас была предыдущая версия с более сложной архитектурой:

1. Замените импорты:
```typescript
// Было
import { createSimplxDataProvider } from '@/lib/refine-data-provider';

// Стало
import { createDataProvider, createAuthProvider } from '@/lib/refine-data-provider';
```

2. Разделите конфигурацию:
```typescript
// Было
const dataProvider = createSimplxDataProvider({
  baseUrl: 'http://localhost:4000',
  apiKey: 'token',
  tenantId: 'tenant-123',
});

// Стало
const authProvider = createAuthProvider({
  apiUrl: 'http://localhost:4000',
});

const dataProvider = createDataProvider({
  apiUrl: 'http://localhost:4000',
});
```

3. Добавьте authProvider в Refine:
```typescript
<Refine
  authProvider={authProvider}  // добавить
  dataProvider={dataProvider}
  // ...
/>
```
