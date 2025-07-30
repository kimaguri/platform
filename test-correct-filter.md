# Правильное тестирование фильтрации

## Проблема в текущем запросе

Текущий запрос использует логическое AND между двумя фильтрами:
```json
{
  "filters": [
    {"field": "dictionary_id", "operator": "eq", "value": "826f905e-4719-4f2d-9318-c22c385015ec"},
    {"field": "id", "operator": "eq", "value": "826f905e-4719-4f2d-9318-c22c385015ec"}
  ]
}
```

Это означает поиск записи, где **одновременно**:
- `dictionary_id = "826f905e-4719-4f2d-9318-c22c385015ec"`
- `id = "826f905e-4719-4f2d-9318-c22c385015ec"`

Но это невозможно! `id` записи `dictionary_value` не может быть равен `dictionary_id`.

## Правильные тестовые запросы

### 1. Поиск всех значений для конкретного справочника

```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [
      {
        "field": "dictionary_id",
        "operator": "eq",
        "value": "826f905e-4719-4f2d-9318-c22c385015ec"
      }
    ],
    "select": "*, _dictionary:dictionary_id(*)",
    "pagination": {"page": 1, "limit": 20},
    "sort": [{"field": "created_at", "direction": "desc"}]
  }'
```

### 2. Поиск конкретной записи по ID

```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [
      {
        "field": "id",
        "operator": "eq",
        "value": "4f8a2b1c-3d5e-6f7a-8b9c-0d1e2f3a4b5c"
      }
    ],
    "select": "*, _dictionary:dictionary_id(*)",
    "pagination": {"page": 1, "limit": 20}
  }'
```

### 3. Поиск без фильтров (все записи)

```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [],
    "select": "*, _dictionary:dictionary_id(*)",
    "pagination": {"page": 1, "limit": 10}
  }'
```

### 4. Поиск с множественными корректными фильтрами

```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [
      {
        "field": "dictionary_id",
        "operator": "eq",
        "value": "826f905e-4719-4f2d-9318-c22c385015ec"
      },
      {
        "field": "active",
        "operator": "eq",
        "value": true
      }
    ],
    "select": "*, _dictionary:dictionary_id(*)",
    "pagination": {"page": 1, "limit": 20}
  }'
```

## Рекомендация

Попробуйте сначала запрос **без фильтров** (пример 3), чтобы увидеть, какие записи вообще есть в базе. Затем используйте правильные значения для фильтрации.
