# Tenant Management Service

## Назначение
Управление тенантами, их параметрами и расширяемыми полями. Хранение и CRUD для правил конвертации сущностей.

## Возможности
- CRUD для тенантов
- CRUD для entity_conversion_rules (правила конвертации)
- Управление расширяемыми полями (extensible fields)
- Валидация условий срабатывания
- Кеширование метаданных

## Ключевые эндпоинты
- `/conversion-rules` — CRUD для правил
- `/tenants/:tenantId/fields` — расширяемые поля
- `/conversion-rules/validate-conditions` — валидация условий

## Пример структуры правила
```json
{
  "id": "uuid",
  "source_entity": "lead",
  "target_entity": "contact",
  "field_mapping": {"name": "full_name"},
  "trigger_conditions": {"and": [{"field": "status", "eq": "ready"}]},
  "active": true
}
```
