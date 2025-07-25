# Стандарты заголовков HTTP для Simplx Platform

## Обязательные заголовки

### X-Tenant-ID
**Формат:** `X-Tenant-ID: <uuid-v4>`

**Описание:** Идентификатор тенанта для мультитенантной архитектуры.

**Требования:**
- Должен быть валидным UUID v4
- Обязателен для всех API запросов (кроме публичных auth endpoints)
- Должен отправляться в точном формате `X-Tenant-ID` (с заглавными буквами)

**Примеры:**
```
✅ Правильно:
X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000

❌ Неправильно:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
X-TENANT-ID: 550e8400-e29b-41d4-a716-446655440000
tenant-id: 550e8400-e29b-41d4-a716-446655440000
```

## Опциональные заголовки

### Authorization
**Формат:** `Authorization: Bearer <jwt-token>`

**Описание:** JWT токен для аутентификации пользователя.

### User-Agent
**Формат:** `User-Agent: <client-info>`

**Описание:** Информация о клиентском приложении.

### X-Forwarded-For / X-Real-IP
**Формат:** `X-Forwarded-For: <ip-address>` или `X-Real-IP: <ip-address>`

**Описание:** IP адрес клиента для rate limiting и логирования.

## Изменения в архитектуре

### До рефакторинга
- Каждый middleware дублировал логику извлечения заголовков
- Поддерживались различные варианты написания `X-Tenant-ID`
- Сложная логика обработки разных типов запросов (typed/raw)

### После рефакторинга
- Единая утилита `header-utils.ts` для работы с заголовками
- Стандартизированный формат `X-Tenant-ID`
- Упрощенная логика в middleware
- Валидация формата UUID v4 для tenant ID

## Использование в коде

```typescript
import { extractRequestInfo, getTenantId, STANDARD_HEADERS } from '../utils/header-utils';

// Извлечение информации о запросе
const { headers, method, path } = extractRequestInfo(req);

// Получение tenant ID
const tenantId = getTenantId(headers);

// Проверка наличия заголовка
if (!tenantId) {
  throw APIError.invalidArgument(`${STANDARD_HEADERS.TENANT_ID} header is required`);
}
```

## Миграция фронтенда

Фронтенд должен отправлять заголовок **только** в формате `X-Tenant-ID`:

```javascript
// ✅ Правильно
const headers = {
  'X-Tenant-ID': tenantId,
  'Authorization': `Bearer ${token}`
};

// ❌ Больше не поддерживается
const headers = {
  'x-tenant-id': tenantId,  // неправильный регистр
  'X-TENANT-ID': tenantId,  // неправильный регистр
};
```

## Обратная совместимость

⚠️ **Важно:** После внедрения этих изменений backend будет принимать **только** заголовок в формате `X-Tenant-ID`. Все другие варианты написания больше не поддерживаются.

Убедитесь, что все клиентские приложения обновлены для использования правильного формата заголовка.
