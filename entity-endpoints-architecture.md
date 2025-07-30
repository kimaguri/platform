# Архитектура Entity Endpoints - Best Practices

## Текущая проблема
- Сложные фильтры в URL становятся нечитаемыми
- Ограничения длины URL (2048 символов)
- Проблемы с URL-кодированием JSON структур

## Рекомендуемое решение: Гибридный подход

### 1. Простые запросы - GET с query params
```typescript
// Получение по ID
GET /api/v1/entity/dictionary_value/123

// Простая фильтрация
GET /api/v1/entity/dictionary_value?active=true&limit=10
```

### 2. Сложные запросы - POST с body
```typescript
// Сложная фильтрация и поиск
POST /api/v1/entity/dictionary_value/search
{
  "filters": [
    {"field": "dictionary_id", "operator": "eq", "value": "707f7db2..."},
    {"field": "active", "operator": "eq", "value": true}
  ],
  "select": "*, _dictionary:dictionary_id(*)",
  "pagination": {"page": 1, "limit": 20},
  "sort": [{"field": "created_at", "direction": "desc"}]
}
```

## Преимущества этого подхода

### ✅ Плюсы POST с body:
- Неограниченный размер запроса
- Читаемая структура данных
- Легкая валидация и типизация
- Поддержка сложных вложенных фильтров
- Нет проблем с URL-кодированием

### ✅ Плюсы сохранения GET:
- Кешируемость простых запросов
- Совместимость с существующим кодом
- Удобство для отладки в браузере

## Примеры из индустрии

### GitHub API
```typescript
// Простые запросы
GET /repos/owner/repo/issues?state=open

// Сложные запросы через GraphQL
POST /graphql
{
  "query": "query { repository(owner: \"owner\", name: \"repo\") { issues(first: 10, states: [OPEN]) { nodes { title } } } }"
}
```

### Elasticsearch
```typescript
// Все поисковые запросы через POST
POST /index/_search
{
  "query": {"bool": {"must": [{"term": {"status": "active"}}]}},
  "sort": [{"created_at": {"order": "desc"}}],
  "from": 0,
  "size": 20
}
```

### Stripe API
```typescript
// Простые запросы
GET /v1/customers/cus_123

// Сложные запросы с expand
POST /v1/payment_intents
{
  "amount": 1000,
  "currency": "usd",
  "expand": ["customer", "payment_method"]
}
```

## Рекомендуемая реализация

### Этап 1: Добавить search endpoints
```typescript
// Новый endpoint для сложных запросов
POST /api/v1/entity/:entity/search
{
  "filters": ExtensionFieldsFilter[],
  "select": string,
  "pagination": {page: number, limit: number},
  "sort": ExtensionFieldsSorter[]
}

// Сохранить существующие GET endpoints для простых случаев
GET /api/v1/entity/:entity/:id
GET /api/v1/entity/:entity?simple_param=value
```

### Этап 2: Типизация body параметров
```typescript
interface EntitySearchRequest {
  filters?: ExtensionFieldsFilter[];
  select?: string;
  pagination?: {
    page?: number;
    limit?: number;
    offset?: number;
  };
  sort?: ExtensionFieldsSorter[];
  meta?: {
    select?: string;
    [key: string]: any;
  };
}
```

### Этап 3: Миграция фронтенда
```typescript
// Старый подход (оставить для простых случаев)
const simpleData = await api.get('/entity/dictionary_value/123');

// Новый подход для сложных фильтров
const complexData = await api.post('/entity/dictionary_value/search', {
  filters: [
    {field: 'dictionary_id', operator: 'eq', value: '707f7db2...'},
    {field: 'active', operator: 'eq', value: true}
  ],
  select: '*, _dictionary:dictionary_id(*)',
  pagination: {page: 1, limit: 20},
  sort: [{field: 'created_at', direction: 'desc'}]
});
```

## Заключение

**Это правильный подход по best practices:**

1. ✅ **Соответствует REST принципам** - POST для сложных операций поиска
2. ✅ **Используется в крупных API** - GitHub, Stripe, Elasticsearch
3. ✅ **Решает технические ограничения** - длина URL, кодирование
4. ✅ **Улучшает DX** - читаемость, типизация, валидация
5. ✅ **Обратная совместимость** - сохраняем GET для простых случаев

**Рекомендация:** Реализовать гибридный подход с добавлением POST search endpoints для сложных запросов, сохранив GET для простых случаев.
