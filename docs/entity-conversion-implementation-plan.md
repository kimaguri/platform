# План реализации Entity Conversion Rules

## 🔍 Анализ схожего функционала

**Найден идеальный архитектурный паттерн:** система **Extensible Fields** полностью соответствует требованиям для Entity Conversion Rules.

### Архитектурная аналогия:

| Extensible Fields | Entity Conversion Rules |
|-------------------|------------------------|
| `extension_field_definitions` в админской БД | `entity_conversion_rules` в админской БД |
| `extensible-fields.ts` в Data Processing | `entity-conversion.ts` в Data Processing |
| Кеширование field definitions | Кеширование conversion rules |
| Валидация extension fields | Валидация conversion rules |
| `getAdapterForTenant()` | `getAdapterForTenant()` |

## 📋 План реализации

### **Этап 1: Расширение Tenant Management Service**

**1.1 Создание таблицы в админской БД**
```sql
-- В админской БД (zshakbdzhwxfxzyqtizl.supabase.co)
CREATE TABLE entity_conversion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_entity VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    
    -- Условия срабатывания (JSON)
    trigger_conditions JSONB DEFAULT '{}',
    
    -- Маппинг полей (JSON)
    field_mapping JSONB DEFAULT '{}',
    extension_field_mapping JSONB DEFAULT '{}',
    
    -- Настройки конвертации
    manual_conversion_enabled BOOLEAN DEFAULT true,
    auto_conversion_enabled BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    approval_roles JSONB DEFAULT '[]',
    preserve_source BOOLEAN DEFAULT true,
    allow_rollback BOOLEAN DEFAULT false,
    copy_activities BOOLEAN DEFAULT false,
    copy_watchers BOOLEAN DEFAULT false,
    
    -- Шаблоны и значения по умолчанию
    target_name_template TEXT,
    default_values JSONB DEFAULT '{}',
    
    -- Метаданные
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(tenant_id, name)
);

-- Индексы для оптимизации
CREATE INDEX idx_entity_conversion_rules_tenant_id ON entity_conversion_rules(tenant_id);
CREATE INDEX idx_entity_conversion_rules_source_entity ON entity_conversion_rules(source_entity);
CREATE INDEX idx_entity_conversion_rules_target_entity ON entity_conversion_rules(target_entity);
CREATE INDEX idx_entity_conversion_rules_active ON entity_conversion_rules(is_active);
```

**1.2 Создание модуля entity-conversion-rules.ts**
```typescript
// src/services/tenant-management/src/entity-conversion-rules.ts
// Аналогично extensible-fields.ts - функциональный подход
// Кеширование правил с TTL, CRUD операции через админскую БД
```

**1.3 Добавление эндпоинтов в Tenant Management API**
- `GET /tenants/conversion-rules` - получение правил
- `POST /tenants/conversion-rules` - создание правила
- `PUT /tenants/conversion-rules/:ruleId` - обновление правила
- `DELETE /tenants/conversion-rules/:ruleId` - удаление правила

### **Этап 2: Расширение Data Processing Service**

**2.1 Создание модуля entity-conversion**
```typescript
// src/services/data-processing/src/utils/entity-conversion.ts
// Аналогично extensible-fields.ts - использование getAdapterForTenant()
// Функции: executeEntityConversion, checkTriggerConditions, validateConversionRule
```

**2.2 Добавление эндпоинтов в Data Processing API**
- `POST /entity-conversion/execute` - выполнение конвертации
- `GET /entity-conversion/available/:sourceEntity` - доступные правила
- `POST /entity-conversion/check-triggers` - проверка автотриггеров

### **Этап 3: Gateway endpoints**

**3.1 Создание conversion-endpoints.ts**
```typescript
// src/gateway/endpoints/conversion-endpoints.ts
// Проксирование к Tenant Management и Data Processing сервисам
```

**3.2 Обновление service-clients.ts**
```typescript
// Добавить conversionClient с методами:
// - getConversionRules()
// - createConversionRule()
// - executeConversion()
// - getAvailableRules()
```

### **Этап 4: Event Management Service (опционально)**

**4.1 Создание нового сервиса**
```typescript
// src/services/event-management/
// Обработка событий конвертации, аудит, уведомления
```

**4.2 Pub/Sub интеграция**
```typescript
// Топики: conversion-events, audit-events
// Подписчики для логирования и уведомлений
```

## 🎯 Приоритеты реализации

**Высокий приоритет:**
1. ✅ Создание таблицы entity_conversion_rules в админской БД
2. ✅ Модуль entity-conversion-rules.ts в Tenant Management
3. ✅ Модуль entity-conversion.ts в Data Processing
4. ✅ Gateway endpoints для конвертации

**Средний приоритет:**
5. Event Management Service для аудита
6. Автоматические триггеры конвертации
7. Система одобрения (approval workflow)

**Низкий приоритет:**
8. Миграция фронтенда EntityConversionRulesManager
9. Расширенная валидация и тестирование
10. Оптимизация производительности

## 🔧 Технические детали

### Функциональный подход
- Только функции, без классов
- Использование существующих коннекторов и резолверов
- Кеширование с TTL (аналогично extensible fields)

### Система коннекторов
- `getAdapterForTenant()` для работы с тенантскими БД
- Поддержка Supabase и PostgreSQL адаптеров
- Универсальные CRUD операции

### Хранение в админской БД
- Правила конвертации по тенантам
- Метаданные и конфигурация
- Кеширование для производительности

## ⚠️ Риски и рекомендации

1. **Обратная совместимость** - новая архитектура не должна ломать существующий функционал
2. **Поэтапная реализация** - внедрять модули постепенно с возможностью отката
3. **Тестирование** - обязательное покрытие тестами новых функций
4. **Документация** - обновить API документацию для новых эндпоинтов

## 🚀 Следующие шаги

1. Создать таблицу `entity_conversion_rules` в админской БД
2. Реализовать модуль `entity-conversion-rules.ts` в Tenant Management
3. Создать модуль `entity-conversion.ts` в Data Processing
4. Добавить Gateway endpoints
5. Протестировать базовую функциональность
6. Постепенно добавлять расширенные возможности

Этот план использует проверенную архитектуру extensible fields и минимизирует изменения в существующей кодовой базе.
