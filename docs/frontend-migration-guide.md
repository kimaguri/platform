# Руководство по миграции фронтенда на Gateway API с использованием Refine.js

## 1. Концепция миграции

Это руководство описывает переход от прямых вызовов к Supabase к использованию **Gateway API** через **Refine.js Data Provider**. Цель — инкапсулировать всю логику взаимодействия с бэкендом в `dataProvider` и использовать стандартные хуки Refine (`useList`, `useOne`, `useCustom`) в компонентах.

**Ключевое изменение:** Фронтенд больше не работает с базой данных напрямую. Он взаимодействует с четко определенными ресурсами и эндпоинтами, предоставляемыми Gateway.

---

## 2. Настройка Refine Data Provider

Ваш существующий `dataProvider` должен быть настроен на работу с базовым URL нашего Gateway: `/api/v1/`.

Ресурс `conversion-rules` будет соответствовать эндпоинтам:
- `GET /api/v1/conversion-rules`
- `POST /api/v1/conversion-rules`
- и т.д.

Для кастомных эндпоинтов, не вписывающихся в REST-конвенцию, будет использоваться метод `custom` в `dataProvider` и хук `useCustom`.

---

## 3. Детальное руководство по миграции

### 3.1. Управление правилами конвертации (CRUD)

Это стандартные REST-операции, которые идеально ложатся на `dataProvider` Refine.

#### **А. Получение списка правил**

- **Старый код:** `supabaseClient.from('entity_conversion_rules').select('*')`
- **Новый хук:** `useList({ resource: 'conversion-rules' })`
- **Эндпоинт:** `GET /api/v1/conversion-rules`
- **Действие:** Замените прямой вызов Supabase в `hooks/useEntityConversionLogic.ts` на хук `useList`.

**Пример:**
```typescript
// Было
const { data, error } = await supabaseClient.from('entity_conversion_rules').select('*');

// Стало (в компоненте)
const { data, isLoading } = useList<ConversionRule>({ resource: 'conversion-rules' });
```

- **Схема ответа (`ConversionRule[]`):**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "sourceEntity": "string",
    "targetEntity": "string",
    "triggerConditions": {},
    "manualConversionEnabled": true,
    "autoConversionEnabled": false,
    "fieldMapping": {},
    "extensionFieldMapping": {},
    "isActive": true,
    "createdAt": "datetime",
    "createdBy": "uuid"
    // ... и другие поля согласно типу ConversionRule
  }
]
```

#### **Б. Создание нового правила**

- **Старый код:** `supabaseClient.from('entity_conversion_rules').insert(ruleData)`
- **Новый хук:** `useCreate()`
- **Эндпоинт:** `POST /api/v1/conversion-rules`
- **Действие:** Используйте мутацию `create` из хука `useCreate`.

**Пример:**
```typescript
// Было
const { error } = await supabaseClient.from('entity_conversion_rules').insert([ruleData]);

// Стало (в компоненте или хуке)
const { mutate: createRule } = useCreate<ConversionRule>();
createRule({ 
  resource: 'conversion-rules', 
  values: newRuleData 
});
```

- **Схема запроса (тело):** `Omit<ConversionRule, 'id' | 'createdAt'>`
- **Схема ответа:** `ConversionRule` (созданный объект с `id`)

#### **В. Обновление правила**

- **Старый код:** `supabaseClient.from('...').update(ruleData).eq('id', ruleId)`
- **Новый хук:** `useUpdate()`
- **Эндпоинт:** `PUT /api/v1/conversion-rules/:id`
- **Действие:** Используйте мутацию `update`.

**Пример:**
```typescript
const { mutate: updateRule } = useUpdate<ConversionRule>();
updateRule({ 
  resource: 'conversion-rules', 
  id: ruleId, 
  values: updatedFields 
});
```

- **Схема запроса (тело):** `Partial<ConversionRule>`
- **Схема ответа:** `ConversionRule` (обновленный объект)

#### **Г. Удаление правила**

- **Старый код:** `supabaseClient.from('...').delete().eq('id', id)`
- **Новый хук:** `useDelete()`
- **Эндпоинт:** `DELETE /api/v1/conversion-rules/:id`
- **Действие:** Используйте мутацию `remove`.

**Пример:**
```typescript
const { mutate: deleteRule } = useDelete<ConversionRule>();
deleteRule({ resource: 'conversion-rules', id: ruleId });
```

### 3.2. Кастомные операции (не-CRUD)

#### **А. Получение схемы сущности (стандартные и расширяемые поля)**

- **Цель:** Получить полную схему полей для любой сущности (например, `leads`, `clients`), включая как стандартные (системные), так и кастомные (расширяемые) поля. Это позволяет динамически генерировать формы, таблицы и фильтры на фронтенде.
- **Новый хук:** `useCustom()`
- **Эндпоинт:** `GET /api/v1/tenants/entities/:entityTable/schema`
- **Действие:** Используйте хук `useCustom` для выполнения GET-запроса к кастомному эндпоинту.

**Пример:**
```typescript
import { useCustom } from '@refinedev/core';

interface EntityFieldDefinition {
  label: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select' | 'multiselect' | 'textarea' | 'email' | 'phone' | 'url';
  category: 'basic' | 'contact' | 'financial' | 'system' | 'custom';
  isSystemField: boolean;
}

const LeadForm = () => {
  const { data, isLoading, isError } = useCustom<EntityFieldDefinition[]>({
    url: `/api/v1/tenants/entities/lead/schema`,
    method: 'get',
  });

  if (isLoading) {
    return <div>Loading form...</div>;
  }

  if (isError) {
    return <div>Error loading form configuration.</div>;
  }

  const fields = data?.data || [];

  return (
    <form>
      {fields.map(field => (
        <div key={field.value}>
          <label>{field.label}</label>
          {/* Рендеринг инпута в зависимости от field.type */}
          <input name={field.value} type={field.type === 'number' ? 'number' : 'text'} />
        </div>
      ))}
    </form>
  );
};
```

- **Схема ответа (`EntityFieldDefinition[]`):**
```json
[
  {
    "label": "Название лида",
    "value": "name",
    "type": "text",
    "category": "basic",
    "isSystemField": true
  },
  {
    "label": "Дополнительное поле 1",
    "value": "custom_field_1",
    "type": "number",
    "category": "custom",
    "isSystemField": false
  }
]
```

Для этих операций используется хук `useCustom`.

#### **А. Получение доступных правил для конвертации**

- **Старый код:** `supabaseClient.rpc('get_available_conversion_rules', ...)`
- **Новый хук:** `useCustom({ method: 'get', ... })`
- **Эндпоинт:** `GET /api/v1/conversion/available/:sourceEntity`
- **Действие:** Создайте функцию-обертку, которая использует `useCustom` для вызова этого эндпоинта.

**Пример:**
```typescript
const { data, refetch } = useCustom<ConversionRule[]>({
  url: `/api/v1/conversion/available/${sourceEntity}`,
  method: 'get',
  queryOptions: { enabled: false }, // Вызывать по требованию
});

// Вызов при необходимости
// refetch();
```

- **Схема ответа:** `ConversionRule[]` (такая же, как при получении списка, но отфильтрованная)

#### **Б. Выполнение конвертации**

- **Старый код:** `supabaseClient.rpc('convert_entity_universal', ...)`
- **Новый хук:** `useCustom({ method: 'post', ... })`
- **Эндпоинт:** `POST /api/v1/conversion/execute`
- **Действие:** Используйте `useCustom` для отправки POST-запроса.

**Пример:**
```typescript
const { mutate: executeConversion } = useCustom<ConversionResult>();

executeConversion({
  url: '/api/v1/conversion/execute',
  method: 'post',
  values: {
    ruleId: 'uuid',
    sourceRecordId: 'uuid',
    fieldOverrides: {},
  }
});
```

- **Схема запроса (тело):**
```json
{
  "ruleId": "string",
  "sourceRecordId": "string",
  "fieldOverrides": "Record<string, any>" // Опционально
}
```
- **Схема ответа (`ConversionResult`):**
```json
{
  "success": true,
  "targetRecordId": "uuid",
  "message": "Конвертация прошла успешно"
}
```

### 3.3. Получение схемы полей и реализация маппинга

**Это самое важное упрощение.** Весь код, связанный с `get_table_schema_fields`, `extension_table_definitions`, кэшированием схемы и маппингом типов, **должен быть полностью удален с фронтенда.**

#### **Новый механизм**

Вместо старой логики теперь используется один централизованный эндпоинт, который предоставляет полную схему для любой сущности.

- **Эндпоинт:** `GET /api/v1/tenants/entities/:entityTable/schema`
- **Что возвращает:** Полный список полей (стандартных и расширяемых) в формате, готовом для UI.

#### **Как это использовать**

1.  **Для динамических форм:**
    - Вызовите эндпоинт с нужной сущностью (например, `lead`).
    - Используйте полученный массив полей для рендеринга формы.

2.  **Для маппинга полей (например, в правилах конвертации):**
    - Сделайте два параллельных запроса: один для `sourceEntity`, другой для `targetEntity`.
    - `GET /api/v1/tenants/entities/lead/schema` -> `sourceFields`
    - `GET /api/v1/tenants/entities/clients/schema` -> `targetFields`
    - Отобразите два списка в UI, чтобы пользователь мог их сопоставить.

**Пример получения полей для маппинга:**
```typescript
import { useCustom } from '@refinedev/core';

// Используем хук для получения полей исходной и целевой сущностей
const { data: sourceFieldsData } = useCustom<EntityFieldDefinition[]>({
  url: `/api/v1/tenants/entities/${sourceEntity}/schema`,
  method: 'get',
  queryOptions: { enabled: !!sourceEntity },
});

const { data: targetFieldsData } = useCustom<EntityFieldDefinition[]>({
  url: `/api/v1/tenants/entities/${targetEntity}/schema`,
  method: 'get',
  queryOptions: { enabled: !!targetEntity },
});

const sourceFields = sourceFieldsData?.data || [];
const targetFields = targetFieldsData?.data || [];

// Теперь у вас есть два массива для отображения в UI и настройки маппинга.
```

- **Ожидаемая схема ответа (`EntityFieldDefinition[]`):**
```json
[
  {
    "label": "Название поля для UI",
    "value": "Системное имя поля",
    "type": "Тип данных",
    "category": "Категория поля",
    "isSystemField": true
  }
]
```
  url: `/api/v1/entities/${selectedSourceEntity}/fields`,
  method: 'get',
  queryOptions: { enabled: !!selectedSourceEntity },
});
```

- **Ожидаемая схема ответа (`EntityFieldDefinition[]`):**
```json
[
  {
    "label": "Название лида",
    "value": "name",
    "type": "text",
    "category": "basic",
    "isSystemField": false
  },
  {
    "label": "Стоимость",
    "value": "price",
    "type": "number",
    "category": "financial",
    "isSystemField": false
  }
]
```


