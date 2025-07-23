# Схема базы данных для системы расширяемых полей

## Анализ существующей архитектуры

### Сущности для поддержки расширяемых полей в helpdev-new-supabase:

**ТОЛЬКО основные сущности (согласно требованиям пользователя):**

1. **lead** - лиды и потенциальные клиенты (уже имеет `dynamic_attributes` JSONB)
2. **clients** - клиенты и контрагенты
3. **projects** - проекты и задачи
4. **activities** - универсальная система управления задачами
5. **employee** - сотрудники организации

**Примечание:** Дополнительные и справочные сущности (organization, position, contracts, notification, dictionary и др.) НЕ будут поддерживать расширяемые поля согласно требованиям.

### Существующие паттерны:

- Функциональный подход без классов
- Использование ResourceResolver для унификации операций с БД
- Мультитенантность через tenantId в каждом запросе
- Supabase как основной коннектор
- Типы Record<string, any> для гибкости данных

## Схема таблиц

### 1. Таблица метаданных (уже существует в helpdev-new-supabase)

```sql
-- Таблица уже существует в helpdev-new-supabase
-- extension_table_definitions содержит метаданные полей
```

### 2. Колонки custom_fields для основных сущностей

```sql
-- Таблица lead уже имеет dynamic_attributes JSONB
-- Возможно переименование в custom_fields для единообразия

-- Добавление custom_fields к остальным основным таблицам:
ALTER TABLE clients ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE projects ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE activities ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE employee ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
```

### 3. Индексы для производительности

```sql
-- GIN индексы для поиска по JSONB
CREATE INDEX idx_clients_custom_fields_gin ON clients USING GIN (custom_fields);
CREATE INDEX idx_projects_custom_fields_gin ON projects USING GIN (custom_fields);
CREATE INDEX idx_activities_custom_fields_gin ON activities USING GIN (custom_fields);
CREATE INDEX idx_employee_custom_fields_gin ON employee USING GIN (custom_fields);

-- Если у lead поле называется dynamic_attributes, добавим индекс
CREATE INDEX idx_lead_dynamic_attributes_gin ON lead USING GIN (dynamic_attributes);
```

### 4. Опциональная таблица extension_table_values

```sql
-- Таблица уже существует в helpdev-new-supabase
-- Используется для "холодных" полей при > 20 динамических полей
```

## Архитектура системы

### Разделение ответственности:

- **Админская БД (simplx-platform):** Управление метаданными полей через админку
- **Тенантская БД (helpdev-new-supabase):** Хранение значений в custom_fields основных сущностей

### Поддерживаемые сущности:

- ✅ **lead** (мигрировано с dynamic_attributes на custom_fields)
- ✅ **clients** (добавлено custom_fields)
- ✅ **projects** (добавлено custom_fields)
- ✅ **activities** (добавлено custom_fields)
- ✅ **employee** (добавлено custom_fields)

### НЕ поддерживаемые сущности:

- ❌ organization, position, contracts, notification
- ❌ dictionary, dictionary_value, role, permission
- ❌ Все справочные и вспомогательные таблицы

## Миграции

### ✅ Миграция 1: Добавление custom_fields к основным таблицам (ВЫПОЛНЕНО)

```sql
-- 001_add_custom_fields_to_main_entities.sql
ALTER TABLE clients ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE projects ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE activities ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE employee ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;
```

### ✅ Миграция 2: Создание индексов (ВЫПОЛНЕНО)

```sql
-- 002_add_custom_fields_indexes.sql
CREATE INDEX idx_clients_custom_fields_gin ON clients USING GIN (custom_fields);
CREATE INDEX idx_projects_custom_fields_gin ON projects USING GIN (custom_fields);
CREATE INDEX idx_activities_custom_fields_gin ON activities USING GIN (custom_fields);
CREATE INDEX idx_employee_custom_fields_gin ON employee USING GIN (custom_fields);
```

### ✅ Миграция 3: Миграция lead с dynamic_attributes на custom_fields (ВЫПОЛНЕНО)

```sql
-- migrate_lead_dynamic_attributes_to_custom_fields.sql
-- Заменено dynamic_attributes на custom_fields в таблице lead
-- Обновлено view leads_report_view для использования custom_fields
-- Данные сохранены при миграции
```

**Статус:** Все миграции БД выполнены успешно. Все основные сущности теперь имеют колонку `custom_fields` JSONB с соответствующими индексами.
