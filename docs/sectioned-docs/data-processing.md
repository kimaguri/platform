# Data Processing Service

## Назначение
Выполнение конвертации, валидации и трансформации данных. Интеграция с extensible fields.

## Возможности
- executeEntityConversion — выполнение конвертации
- checkTriggerConditions — проверка условий (AND/OR)
- getAvailableConversionRules — доступные правила
- checkAutoTriggers — автоматическая проверка триггеров
- Маппинг и трансформация основных и расширяемых полей
- Валидация данных

## Ключевые эндпоинты
- `POST /entity-conversion/execute` — выполнить конвертацию
- `GET /entity-conversion/available/:sourceEntity` — доступные правила
- `POST /entity-conversion/check-triggers` — автотриггеры
- `POST /entity-conversion/validate-conditions` — валидация условий

## Пример запроса
```json
{
  "sourceEntity": "lead",
  "data": {"name": "..."},
  "ruleId": "..."
}
```
