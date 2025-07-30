# Примеры использования нового Search Endpoint

## Новый POST endpoint для сложных запросов

### URL: `POST /api/v1/entity/:entity/search`

## Примеры запросов

### 1. Фильтрация dictionary_value по dictionary_id

**Запрос:**
```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [
      {
        "field": "dictionary_id",
        "operator": "eq",
        "value": "707f7db2-cbe7-43d1-a357-08f73a67748e"
      }
    ],
    "select": "*, _dictionary:dictionary_id(*)",
    "pagination": {
      "page": 1,
      "limit": 20
    },
    "sort": [
      {
        "field": "created_at",
        "direction": "desc"
      }
    ]
  }'
```

### 2. Множественная фильтрация

**Запрос:**
```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [
      {
        "field": "dictionary_id",
        "operator": "eq",
        "value": "707f7db2-cbe7-43d1-a357-08f73a67748e"
      },
      {
        "field": "active",
        "operator": "eq",
        "value": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10
    },
    "sort": [
      {
        "field": "order",
        "direction": "asc"
      }
    ]
  }'
```

### 3. Поиск с LIKE оператором

**Запрос:**
```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [
      {
        "field": "name",
        "operator": "like",
        "value": "%мин%"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20
    }
  }'
```

### 4. Фильтрация по списку значений (IN оператор)

**Запрос:**
```bash
curl -X POST http://localhost:4000/api/v1/entity/dictionary_value/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "filters": [
      {
        "field": "dictionary_id",
        "operator": "in",
        "value": [
          "707f7db2-cbe7-43d1-a357-08f73a67748e",
          "826f905e-4719-4f2d-9318-c22c385015ec"
        ]
      }
    ],
    "select": "*, _dictionary:dictionary_id(*)",
    "pagination": {
      "page": 1,
      "limit": 50
    }
  }'
```

## Ожидаемый ответ

```json
{
  "data": [
    {
      "baseFields": {
        "_dictionary": {
          "id": "707f7db2-cbe7-43d1-a357-08f73a67748e",
          "name": "Напоминание задачи",
          "code": "reminder_time"
        },
        "id": "88e9b376-c76a-4d8c-a8fd-b029fd9dd166",
        "dictionary_id": "707f7db2-cbe7-43d1-a357-08f73a67748e",
        "name": "В момент события",
        "value": "В момент события",
        "code": "0",
        "order": 0,
        "active": true,
        "default": false,
        "created_at": "2024-04-22T10:32:43.441752+00:00"
      },
      "extensions": {}
    }
  ],
  "message": "Found 6 dictionary_value entities",
  "meta": {
    "total": 6,
    "limit": 20,
    "page": 1,
    "hasMore": false
  }
}
```

## Преимущества нового подхода

### ✅ Читаемость
- Структурированные фильтры в JSON
- Понятная типизация
- Легкая отладка

### ✅ Гибкость
- Множественные фильтры
- Различные операторы (eq, ne, gt, like, in, etc.)
- Сложная сортировка
- Настраиваемая пагинация

### ✅ Производительность
- Нет ограничений длины URL
- Эффективная сериализация
- Оптимизированные запросы к БД

### ✅ Совместимость
- Сохранены GET endpoints для простых случаев
- Обратная совместимость
- Постепенная миграция

## Сравнение подходов

### Старый подход (GET с query params)
```
GET /api/v1/entity/dictionary_value?dictionary_id=707f7db2-cbe7-43d1-a357-08f73a67748e&active=true&page=1&limit=20&sort=created_at:desc
```

### Новый подход (POST с body)
```
POST /api/v1/entity/dictionary_value/search
{
  "filters": [
    {"field": "dictionary_id", "operator": "eq", "value": "707f7db2..."},
    {"field": "active", "operator": "eq", "value": true}
  ],
  "pagination": {"page": 1, "limit": 20},
  "sort": [{"field": "created_at", "direction": "desc"}]
}
```

## Поддерживаемые операторы

- `eq` - равно
- `ne` - не равно  
- `gt` - больше
- `gte` - больше или равно
- `lt` - меньше
- `lte` - меньше или равно
- `like` - LIKE (для строк с %)
- `in` - в списке значений
- `not_in` - не в списке значений
