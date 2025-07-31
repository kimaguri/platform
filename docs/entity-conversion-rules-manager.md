# Компонент EntityConversionRulesManager

## Обзор

`EntityConversionRulesManager` - это сложный компонент для управления правилами конвертации сущностей в системе. Компонент позволяет создавать, редактировать и управлять правилами автоматической и ручной конвертации одних сущностей в другие (например, лид → клиент, клиент → проект).

## Архитектура компонента

### Основные файлы:
- `index.tsx` - главный компонент с UI
- `hooks/useEntityConversionState.ts` - управление состоянием через useReducer
- `hooks/useEntityConversionLogic.ts` - бизнес-логика и операции с БД
- `types.ts` - TypeScript интерфейсы
- `meta.tsx` - конфигурация колонок таблицы
- `components/` - вспомогательные компоненты (модальные окна, формы)

## Работа с таблицами базы данных

### Основная таблица: `entity_conversion_rules`

Компонент работает с основной таблицей `entity_conversion_rules`, которая содержит следующие поля:

```typescript
interface ConversionRule {
    id: string                              // UUID правила
    name: string                           // Название правила
    description?: string                   // Описание правила
    source_entity: string                  // Исходная сущность (lead, client, etc.)
    target_entity: string                  // Целевая сущность (client, project, etc.)
    trigger_conditions: Record<string, any> // JSON условия срабатывания
    manual_conversion_enabled: boolean     // Разрешена ручная конвертация
    auto_conversion_enabled: boolean       // Разрешена автоматическая конвертация
    field_mapping: Record<string, string>  // JSON маппинг базовых полей
    extension_field_mapping: Record<string, string> // JSON маппинг extension полей
    requires_approval: boolean             // Требует подтверждения
    approval_roles: string[]               // Роли для подтверждения
    preserve_source: boolean               // Сохранять исходную запись
    allow_rollback: boolean                // Разрешить откат
    copy_activities: boolean               // Копировать активности
    copy_watchers: boolean                 // Копировать наблюдателей
    target_name_template?: string          // Шаблон имени целевой записи
    default_values: Record<string, any>    // JSON значения по умолчанию
    is_active: boolean                     // Активность правила
    created_at: string                     // Дата создания
    created_by: string                     // UUID создателя
}
```

### CRUD операции с таблицей `entity_conversion_rules`:

#### 1. Загрузка правил (READ)
```typescript
const { data, error } = await supabaseClient
    .from('entity_conversion_rules')
    .select('*')
    .order('created_at', { ascending: false })
```

#### 2. Создание правила (CREATE)
```typescript
const { error } = await supabaseClient
    .from('entity_conversion_rules')
    .insert([ruleData])
```

#### 3. Обновление правила (UPDATE)
```typescript
const { error } = await supabaseClient
    .from('entity_conversion_rules')
    .update(ruleData)
    .eq('id', ruleId)
```

#### 4. Удаление правила (DELETE)
```typescript
const { error } = await supabaseClient
    .from('entity_conversion_rules')
    .delete()
    .eq('id', id)
```

#### 5. Переключение активности правила
```typescript
const { error } = await supabaseClient
    .from('entity_conversion_rules')
    .update({ is_active: isActive })
    .eq('id', id)
```

### Динамическое получение схемы БД

#### Архитектура получения схемы

Компонент использует многоуровневую систему получения информации о полях сущностей:

1. **RPC функция `get_table_schema_fields`** - основной источник данных
2. **Таблица `extension_table_definitions`** - для extension полей
3. **Статические определения** - fallback при ошибках
4. **Кэширование** - оптимизация повторных запросов

#### Процесс получения схемы колонок

##### 1. Проверка и создание RPC функции

```typescript
export const ensureSchemaFunction = async (): Promise<void> => {
    try {
        // Проверяем существование функции тестовым вызовом
        await supabaseClient.rpc('get_table_schema_fields', {
            table_name: 'lead'
        })
        console.log('✅ RPC функция get_table_schema_fields уже существует')
    } catch (e) {
        console.warn('⚠️ RPC функция get_table_schema_fields не найдена')
        throw new Error('RPC функция get_table_schema_fields не найдена')
    }
}
```

**RPC функция должна быть создана в БД вручную и выполнять запрос:**
```sql
CREATE OR REPLACE FUNCTION get_table_schema_fields(table_name text)
RETURNS TABLE(
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    display_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text,
        COALESCE(c.column_name, c.column_name)::text as display_name
    FROM information_schema.columns c
    WHERE c.table_name = $1 
        AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;
```

##### 2. Кэширование схемы

```typescript
const schemaCache = new Map<string, EntityFieldDefinition[]>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

// Ключ кэша включает временную метку для автоматической инвалидации
const cacheKey = `${entityType}_${Math.floor(Date.now() / CACHE_DURATION)}`

if (schemaCache.has(cacheKey)) {
    console.log(`📦 Используем кэш для ${entityType}`)
    return schemaCache.get(cacheKey)!
}
```

##### 3. Получение базовых полей из схемы

```typescript
// Вызов RPC функции для получения схемы таблицы
const { data: schemaFields, error: schemaError } = await supabaseClient.rpc(
    'get_table_schema_fields',
    { table_name: entityType }
)

// Преобразование PostgreSQL полей в нашу структуру
const baseFields: EntityFieldDefinition[] = schemaFields?.map((field: any) => {
    const category = getCategoryFromField(field.column_name, field.data_type)
    return {
        label: field.display_name || field.column_name,
        value: field.column_name,
        type: mapPostgreSQLTypeToFieldType(field.data_type),
        category,
        isRequired: field.is_nullable === 'NO',
        isSystemField: category === 'system',
        options: getFieldOptions(field.column_name, field.data_type, entityType)
    }
}) || []
```

##### 4. Получение Extension полей

```typescript
// Запрос к таблице extension_table_definitions
const { data: extensionFields, error: extError } = await supabaseClient
    .from('extension_table_definitions')
    .select('*')
    .eq('entity_table', entityType)
    .eq('is_active', true)

// Преобразование extension полей
const extensionFieldDefinitions: EntityFieldDefinition[] = extensionFields?.map((ext) => ({
    label: ext.display_name,
    value: ext.field_name,
    type: mapPostgreSQLTypeToFieldType(ext.field_type),
    category: 'extension',
    isRequired: ext.is_required,
    options: getExtensionFieldOptionsSync(ext)
})) || []
```

##### 5. Маппинг типов PostgreSQL

```typescript
export const mapPostgreSQLTypeToFieldType = (pgType: string): EntityFieldDefinition['type'] => {
    switch (pgType.toLowerCase()) {
        case 'smallint':
        case 'integer':
        case 'bigint':
        case 'numeric':
        case 'real':
        case 'double precision':
        case 'decimal':
            return 'number'
        case 'boolean':
            return 'boolean'
        case 'date':
        case 'timestamp':
        case 'timestamptz':
            return 'date'
        case 'uuid':
            return 'uuid'
        case 'text':
        case 'varchar':
        case 'character varying':
        default:
            return 'text'
    }
}
```

##### 6. Категоризация полей

```typescript
export const getCategoryFromField = (
    columnName: string,
    dataType: string
): EntityFieldDefinition['category'] => {
    // Системные поля
    if (isSystemField(columnName)) {
        return 'system'
    }
    
    // Финансовые поля
    if (columnName.includes('price') || columnName.includes('cost') || 
        columnName.includes('amount') || columnName.includes('budget')) {
        return 'financial'
    }
    
    // Статусы
    if (columnName.includes('status') || columnName.includes('state') || 
        columnName.includes('stage')) {
        return 'status'
    }
    
    // Связи (UUID поля, заканчивающиеся на _id)
    if (dataType === 'uuid' && columnName.endsWith('_id')) {
        return 'relationship'
    }
    
    return 'basic'
}
```

#### Таблицы, используемые для получения схемы:

1. **`information_schema.columns`** - системная таблица PostgreSQL с метаданными колонок
2. **`information_schema.tables`** - системная таблица с информацией о таблицах
3. **`extension_table_definitions`** - пользовательская таблица с определениями extension полей
4. **Любые таблицы в схеме `public`** - для анализа их структуры

#### Fallback механизм

При ошибках получения схемы из БД используется статическое определение:

```typescript
export const getEntityFieldsStatic = (entityType: string): EntityFieldDefinition[] => {
    // Статические определения для основных сущностей
    const staticDefinitions = {
        lead: [
            { label: 'Название', value: 'name', type: 'text', category: 'basic' },
            { label: 'Email', value: 'email', type: 'text', category: 'basic' },
            // ... другие поля
        ],
        client: [
            // ... определения для клиентов
        ]
        // ... другие сущности
    }
    
    return staticDefinitions[entityType] || []
}
```

### Extension поля

Компонент интегрируется с системой extension полей через атомы Jotai:
- `extensionConfigAtom` - конфигурация extension полей
- `hasExtensionFieldsAtom` - проверка наличия extension полей
- `getActiveFieldsAtom` - получение активных полей

## Процесс конвертации сущностей

### Архитектура системы конвертации

Система конвертации работает на основе правил, созданных через `EntityConversionRulesManager`, и выполняется через специальные RPC функции в базе данных. Процесс включает несколько этапов:

1. **Создание правил конвертации** - через UI компонента
2. **Получение доступных правил** - для конкретной сущности
3. **Выполнение конвертации** - через RPC функции
4. **Автоматические триггеры** - для автоконвертации

### Таблицы, участвующие в процессе конвертации

#### Основные таблицы:
1. **`entity_conversion_rules`** - хранение правил конвертации
2. **Исходные таблицы** - откуда конвертируем (lead, client, project и т.д.)
3. **Целевые таблицы** - куда конвертируем
4. **`extension_table_definitions`** - для работы с extension полями
5. **Системные таблицы логирования** - для аудита конвертаций

### Процесс ручной конвертации

#### 1. Получение доступных правил конвертации

Когда пользователь инициирует конвертацию (например, из интерфейса лидов), система вызывает RPC функцию:

```typescript
// В компоненте LeadActions (features/leads/meta.tsx)
const handleUniversalConversion = async () => {
    try {
        // Получаем доступные правила конвертации для лидов
        const { data: rules, error: rulesError } = await supabaseClient.rpc(
            'get_available_conversion_rules',
            {
                p_source_entity: 'lead',
                p_project_context: 'helpdev'
            }
        )
        
        if (rulesError) throw rulesError
        
        if (!rules || rules.length === 0) {
            message.warning('Нет доступных правил конвертации для лидов')
            return
        }
        
        // Если только одно правило, используем его
        if (rules.length === 1) {
            await performConversion(rules[0].id)
            return
        }
        
        // Если несколько правил, показываем выбор пользователю
        showConversionRulesModal(rules)
    } catch (error: any) {
        console.error('Ошибка получения правил конвертации:', error)
        message.error('Ошибка при получении правил конвертации')
    }
}
```

**RPC функция `get_available_conversion_rules` должна:**
- Фильтровать правила по исходной сущности (`source_entity`)
- Проверять активность правил (`is_active = true`)
- Проверять разрешение ручной конвертации (`manual_conversion_enabled = true`)
- Учитывать контекст проекта
- Возвращать отсортированный список доступных правил

#### 2. Выполнение конвертации

После выбора правила выполняется основная RPC функция конвертации:

```typescript
const performConversion = async (ruleId: string) => {
    try {
        const { data, error } = await supabaseClient.rpc('convert_entity_universal', {
            p_rule_id: ruleId,
            p_source_record_id: record.id,
            p_field_overrides: {}, // Дополнительные значения полей
            p_requires_approval: null // Требует ли подтверждения
        })
        
        if (error) throw error
        
        if (data?.success) {
            message.success(`Лид успешно конвертирован!`)
            onRefresh?.()
        } else {
            message.error(data?.error || 'Ошибка при конвертации')
        }
    } catch (error: any) {
        console.error('Ошибка конвертации:', error)
        message.error(error.message || 'Ошибка при конвертации лида')
    }
}
```

### RPC функция `convert_entity_universal`

Эта функция выполняет основную логику конвертации и должна:

#### Входные параметры:
- `p_rule_id` - ID правила конвертации
- `p_source_record_id` - ID исходной записи
- `p_field_overrides` - JSON с дополнительными значениями полей
- `p_requires_approval` - флаг требования подтверждения

#### Логика выполнения:

1. **Получение правила конвертации:**
```sql
SELECT * FROM entity_conversion_rules 
WHERE id = p_rule_id AND is_active = true;
```

2. **Получение исходной записи:**
```sql
-- Динамический запрос к исходной таблице
EXECUTE format('SELECT * FROM %I WHERE id = $1', rule.source_entity) 
USING p_source_record_id;
```

3. **Проверка условий конвертации:**
```sql
-- Проверка trigger_conditions из правила
-- Например: {"status": "qualified", "budget": ">10000"}
```

4. **Маппинг полей:**
```sql
-- Применение field_mapping из правила
-- Преобразование: {"lead_name": "client_name", "lead_email": "email"}
```

5. **Создание новой записи:**
```sql
-- Динамическая вставка в целевую таблицу
EXECUTE format('INSERT INTO %I (%s) VALUES (%s) RETURNING id', 
    rule.target_entity, columns, values);
```

6. **Обработка extension полей:**
```sql
-- Если есть extension_field_mapping, создаем записи в extension таблицах
INSERT INTO extension_data (entity_table, entity_id, field_name, field_value)
SELECT rule.target_entity, new_record_id, field_name, mapped_value
FROM extension_mappings;
```

7. **Дополнительные действия:**
```sql
-- Если copy_activities = true
INSERT INTO activity (entity_table, entity_id, ...)
SELECT rule.target_entity, new_record_id, ...
FROM activity WHERE entity_table = rule.source_entity AND entity_id = p_source_record_id;

-- Если copy_watchers = true
INSERT INTO watchers (entity_table, entity_id, user_id)
SELECT rule.target_entity, new_record_id, user_id
FROM watchers WHERE entity_table = rule.source_entity AND entity_id = p_source_record_id;
```

8. **Обновление исходной записи:**
```sql
-- Если preserve_source = false, помечаем как конвертированную
UPDATE lead SET conversion_status = 'converted', 
    converted_to_entity = rule.target_entity,
    converted_to_id = new_record_id,
    converted_at = NOW()
WHERE id = p_source_record_id;
```

### Автоматическая конвертация

#### Триггеры базы данных

Для автоматической конвертации создаются триггеры на исходных таблицах:

```sql
CREATE OR REPLACE FUNCTION check_auto_conversion_rules()
RETURNS TRIGGER AS $$
DECLARE
    rule_record RECORD;
    conditions_met BOOLEAN;
BEGIN
    -- Получаем все активные правила автоконвертации для данной сущности
    FOR rule_record IN 
        SELECT * FROM entity_conversion_rules 
        WHERE source_entity = TG_TABLE_NAME 
            AND auto_conversion_enabled = true 
            AND is_active = true
    LOOP
        -- Проверяем условия срабатывания
        conditions_met := check_trigger_conditions(NEW, rule_record.trigger_conditions);
        
        IF conditions_met THEN
            -- Выполняем автоматическую конвертацию
            PERFORM convert_entity_universal(
                rule_record.id,
                NEW.id,
                '{}',
                rule_record.requires_approval
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггеры для каждой таблицы
CREATE TRIGGER auto_conversion_trigger
    AFTER INSERT OR UPDATE ON lead
    FOR EACH ROW
    EXECUTE FUNCTION check_auto_conversion_rules();
```

#### Условия срабатывания

Функция `check_trigger_conditions` проверяет JSON условия из поля `trigger_conditions`:

```sql
CREATE OR REPLACE FUNCTION check_trigger_conditions(
    record_data JSONB,
    conditions JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    condition_key TEXT;
    condition_value TEXT;
    record_value TEXT;
BEGIN
    -- Проходим по всем условиям
    FOR condition_key, condition_value IN SELECT * FROM jsonb_each_text(conditions)
    LOOP
        record_value := record_data ->> condition_key;
        
        -- Проверяем различные типы условий
        IF condition_value LIKE '>%' THEN
            -- Числовое сравнение больше
            IF record_value::NUMERIC <= substring(condition_value, 2)::NUMERIC THEN
                RETURN FALSE;
            END IF;
        ELSIF condition_value LIKE '<%' THEN
            -- Числовое сравнение меньше
            IF record_value::NUMERIC >= substring(condition_value, 2)::NUMERIC THEN
                RETURN FALSE;
            END IF;
        ELSE
            -- Точное совпадение
            IF record_value != condition_value THEN
                RETURN FALSE;
            END IF;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Система подтверждений (Approval System)

Для правил с `requires_approval = true` создается система подтверждений:

#### Таблица ожидающих подтверждений:
```sql
CREATE TABLE conversion_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES entity_conversion_rules(id),
    source_record_id UUID NOT NULL,
    source_entity TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    field_overrides JSONB DEFAULT '{}',
    requested_by UUID REFERENCES employee(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES employee(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Процесс подтверждения:
1. При конвертации с `requires_approval = true` создается запись в `conversion_approvals`
2. Уведомления отправляются пользователям с соответствующими ролями
3. После подтверждения выполняется фактическая конвертация
4. При отклонении запись удаляется с указанием причины

### Мониторинг и логирование

#### Таблица логов конвертации:
```sql
CREATE TABLE conversion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES entity_conversion_rules(id),
    source_entity TEXT NOT NULL,
    source_record_id UUID NOT NULL,
    target_entity TEXT NOT NULL,
    target_record_id UUID,
    conversion_type TEXT, -- manual, automatic
    status TEXT, -- success, failed, pending_approval
    error_message TEXT,
    field_mappings_applied JSONB,
    execution_time_ms INTEGER,
    performed_by UUID REFERENCES employee(id),
    performed_at TIMESTAMP DEFAULT NOW()
);
```

### Откат конвертации (Rollback)

Для правил с `allow_rollback = true` реализована система отката:

```sql
CREATE OR REPLACE FUNCTION rollback_conversion(
    p_conversion_log_id UUID
) RETURNS JSONB AS $$
DECLARE
    log_record RECORD;
    rule_record RECORD;
BEGIN
    -- Получаем информацию о конвертации
    SELECT * INTO log_record FROM conversion_logs WHERE id = p_conversion_log_id;
    SELECT * INTO rule_record FROM entity_conversion_rules WHERE id = log_record.rule_id;
    
    IF NOT rule_record.allow_rollback THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rollback not allowed for this rule');
    END IF;
    
    -- Удаляем целевую запись
    EXECUTE format('DELETE FROM %I WHERE id = $1', log_record.target_entity) 
    USING log_record.target_record_id;
    
    -- Восстанавливаем исходную запись
    IF NOT rule_record.preserve_source THEN
        EXECUTE format('UPDATE %I SET conversion_status = NULL, converted_to_entity = NULL, converted_to_id = NULL, converted_at = NULL WHERE id = $1', log_record.source_entity)
        USING log_record.source_record_id;
    END IF;
    
    -- Логируем откат
    INSERT INTO conversion_logs (rule_id, source_entity, source_record_id, target_entity, conversion_type, status, performed_by)
    VALUES (log_record.rule_id, log_record.target_entity, log_record.target_record_id, log_record.source_entity, 'rollback', 'success', current_user_id());
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

### Интеграция с UI

#### Места запуска конвертации:

1. **Действия в таблицах** - кнопки конвертации в строках таблиц
2. **Детальные страницы** - кнопки конвертации на страницах просмотра записей
3. **Массовые операции** - конвертация нескольких записей одновременно
4. **Автоматические триггеры** - срабатывание при изменении данных

#### Уведомления пользователей:

- **Успешная конвертация** - `message.success('Лид успешно конвертирован!')`
- **Ошибки конвертации** - `message.error('Ошибка при конвертации')`
- **Ожидание подтверждения** - `message.info('Запрос на конвертацию отправлен на подтверждение')`
- **Автоматические уведомления** - через систему нотификаций

### Производительность системы конвертации

#### Оптимизации:

1. **Индексы на ключевых полях:**
```sql
CREATE INDEX idx_conversion_rules_source_entity ON entity_conversion_rules(source_entity) WHERE is_active = true;
CREATE INDEX idx_conversion_logs_source_record ON conversion_logs(source_entity, source_record_id);
```

2. **Пакетная обработка** для массовых конвертаций
3. **Асинхронная обработка** для сложных конвертаций
4. **Кэширование правил** в памяти приложения

### Безопасность конвертации

1. **Проверка прав доступа** - пользователь должен иметь права на исходную и целевую сущности
2. **Валидация данных** - проверка корректности маппинга полей
3. **Транзакционность** - все операции выполняются в рамках транзакций
4. **Аудит** - все конвертации логируются с указанием исполнителя
5. **Ограничения скорости** - защита от массовых автоматических конвертаций

## Функциональность компонента

### 1. Управление правилами конвертации
- **Создание новых правил** - через модальное окно с многошаговым мастером
- **Редактирование существующих правил** - изменение всех параметров правила
- **Удаление правил** - с подтверждением действия
- **Активация/деактивация правил** - переключение статуса без удаления

### 2. Многошаговый мастер создания правил

#### Шаг 1: Основная информация
- Выбор исходной сущности (`source_entity`)
- Выбор целевой сущности (`target_entity`)
- Настройка базовых параметров правила

#### Шаг 2: Маппинг полей
- **Автоматические предложения** - система анализирует поля и предлагает маппинг
- **Ручная настройка** - пользователь может настроить маппинг вручную
- **Умные предложения** - алгоритм сопоставления полей по:
  - Точному совпадению имен
  - Семантическому сходству
  - Совместимости типов данных
  - Схожести названий (алгоритм Левенштейна)

#### Шаг 3: Условия конвертации
- Настройка условий срабатывания правила
- Логические операторы (AND/OR)
- Множественные условия

#### Шаг 4: Дополнительные настройки
- Настройки копирования связанных данных
- Шаблоны именования
- Права доступа и подтверждения

### 3. Алгоритм умных предложений маппинга

```typescript
interface FieldSuggestion {
    sourceField: string
    targetField: string
    confidence: number  // 0-100%
    reason: 'exact_match' | 'semantic_similarity' | 'type_match' | 'name_similarity'
    reasonDescription: string
}
```

#### Критерии сопоставления:
1. **Точное совпадение** (100% confidence) - имена полей идентичны
2. **Семантическое сходство** (80-95%) - поля имеют схожий смысл
3. **Совместимость типов** (60-80%) - типы данных совместимы
4. **Схожесть названий** (40-70%) - похожие названия полей

### 4. Категоризация полей

Система автоматически категоризирует поля по типам:

```typescript
const FIELD_CATEGORIES = {
    basic: { name: 'Основные', description: 'Основная информация' },
    financial: { name: 'Финансовые', description: 'Финансовые данные' },
    status: { name: 'Статусы', description: 'Статусы и состояния' },
    relationship: { name: 'Связи', description: 'Связи с другими сущностями' },
    extension: { name: 'Расширения', description: 'Дополнительные поля' },
    system: { name: 'Системные', description: 'Системные поля' }
}
```

### 5. Фильтрация системных полей

Компонент автоматически скрывает системные поля от пользователя:

```typescript
const SYSTEM_FIELDS = [
    'id', 'uuid', 'created_at', 'updated_at', 'created_by', 
    'updated_by', 'deleted_at', 'modified_at', 'modified_by',
    'version', 'revision', 'audit_trail', 'tenant_id', 'organization_id'
]
```

## Интеграция с другими системами

### 1. Система прав доступа
- Использует `useUser()` для получения `employeeId`
- Сохраняет создателя правила в поле `created_by`
- Поддерживает роли для подтверждения конвертации

### 2. Система уведомлений
- Использует Ant Design `message` для уведомлений
- Информирует о результатах операций (создание, обновление, удаление)

### 3. Кэширование
- Кэширование схемы БД на 5 минут для оптимизации производительности
- Автоматическая очистка кэша при необходимости

## Состояние компонента

Компонент использует `useReducer` для управления сложным состоянием:

```typescript
interface EntityConversionState {
    // Основные данные
    rules: ConversionRule[]
    loading: boolean
    modalVisible: boolean
    editingRule: ConversionRule | null
    currentStep: number
    
    // Поля сущностей
    sourceEntity: string
    targetEntity: string
    sourceFields: EntityFieldDefinition[]
    targetFields: EntityFieldDefinition[]
    loadingFields: boolean
    
    // Маппинг полей
    fieldMappings: FieldMappingItem[]
    smartSuggestions: FieldSuggestion[]
    loadingSuggestions: boolean
    step2ViewMode: 'suggestions' | 'mappings'
    
    // Условия конвертации
    conditions: ConversionCondition[]
    logicOperator: 'and' | 'or'
}
```

## Производительность и оптимизация

### 1. Мемоизация
- Все callback функции обернуты в `useCallback`
- Зависимости тщательно контролируются для предотвращения лишних рендеров

### 2. Кэширование
- Схема БД кэшируется на 5 минут
- Результаты запросов к `information_schema` сохраняются в памяти

### 3. Ленивая загрузка
- Поля сущностей загружаются только при необходимости
- Умные предложения генерируются асинхронно

## Безопасность

### 1. Валидация данных
- Проверка обязательных полей на каждом шаге
- Валидация совместимости типов полей
- Проверка существования сущностей

### 2. Права доступа
- Интеграция с системой ролей
- Контроль доступа к операциям создания/редактирования
- Аудит действий через поле `created_by`

## Расширяемость

Компонент спроектирован для легкого расширения:

1. **Новые типы сущностей** - добавляются автоматически через схему БД
2. **Новые условия конвертации** - расширение через типы условий
3. **Дополнительные алгоритмы маппинга** - модульная архитектура предложений
4. **Интеграция с внешними системами** - через расширение утилит

## Заключение

`EntityConversionRulesManager` представляет собой комплексное решение для управления правилами конвертации сущностей с богатой функциональностью, включающей:

- Динамическую работу со схемой БД
- Интеллектуальные предложения маппинга полей
- Гибкую систему условий конвертации
- Интеграцию с системами прав доступа и extension полей
- Оптимизированную производительность через кэширование и мемоизацию

Компонент активно использует одну основную таблицу `entity_conversion_rules` для хранения правил и динамически анализирует схему БД через `information_schema` для получения актуальной информации о полях сущностей.
