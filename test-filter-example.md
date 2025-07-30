# Пример правильного использования фильтров

## Проблема
В запросе фильтры передавались как отдельные query параметры:
```
GET /api/v1/entity/dictionary_value?dictionary_id=707f7db2-cbe7-43d1-a357-08f73a67748e&select=*,%20_dictionary:dictionary_id(*)&page=1&limit=20
```

## Решение
Фильтры должны передаваться в параметре `filters` как JSON массив:

```
GET /api/v1/entity/dictionary_value?filters=[{"field":"dictionary_id","operator":"eq","value":"707f7db2-cbe7-43d1-a357-08f73a67748e"}]&select=*,%20_dictionary:dictionary_id(*)&page=1&limit=20
```

## Структура фильтра

```json
[
  {
    "field": "dictionary_id",
    "operator": "eq", 
    "value": "707f7db2-cbe7-43d1-a357-08f73a67748e"
  }
]
```

## Поддерживаемые операторы
- `eq` - равно
- `ne` - не равно  
- `gt` - больше
- `gte` - больше или равно
- `lt` - меньше
- `lte` - меньше или равно
- `like` - LIKE (для строк)
- `in` - в списке значений
- `not_in` - не в списке значений

## Пример с несколькими фильтрами

```
GET /api/v1/entity/dictionary_value?filters=[{"field":"dictionary_id","operator":"eq","value":"707f7db2-cbe7-43d1-a357-08f73a67748e"},{"field":"active","operator":"eq","value":true}]
```

## URL-кодированный вариант для браузера

```
GET /api/v1/entity/dictionary_value?filters=%5B%7B%22field%22%3A%22dictionary_id%22%2C%22operator%22%3A%22eq%22%2C%22value%22%3A%22707f7db2-cbe7-43d1-a357-08f73a67748e%22%7D%5D&select=*%2C%20_dictionary%3Adictionary_id%28*%29&page=1&limit=20
```
