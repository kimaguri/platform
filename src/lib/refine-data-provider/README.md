# Refine Data Provider для API Gateway

Простая и чистая архитектура для работы Refine с API Gateway. Supabase используется только на бэкенде.

## Архитектура

```
Frontend (Refine) → API Gateway → Backend Services (включая Supabase)
```

- **authProvider.ts** - управляет аутентификацией через API Gateway
- **dataProvider.ts** - выполняет CRUD операции через API Gateway с автоматической подстановкой токенов

## Быстрый старт

### 1. Настройка Auth Provider

```typescript
import { createAuthProvider } from '@/lib/refine-data-provider';

const authProvider = createAuthProvider({
  apiUrl: 'http://localhost:4000', // URL вашего API Gateway
  loginEndpoint: '/auth/login',     // опционально
  logoutEndpoint: '/auth/logout',   // опционально
  checkEndpoint: '/auth/check',     // опционально
  identityEndpoint: '/auth/me',     // опционально
});
```

### 2. Настройка Data Provider

```typescript
import { createDataProvider } from '@/lib/refine-data-provider';

const dataProvider = createDataProvider({
  apiUrl: 'http://localhost:4000', // URL вашего API Gateway
  headers: {                       // дополнительные заголовки (опционально)
    'X-Client-Version': '1.0.0',
  },
});
```

### 3. Использование с Refine

```typescript
import { Refine } from '@refinedev/core';
import { createAuthProvider, createDataProvider } from '@/lib/refine-data-provider';

const authProvider = createAuthProvider({
  apiUrl: process.env.REACT_APP_API_URL!,
});

const dataProvider = createDataProvider({
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
