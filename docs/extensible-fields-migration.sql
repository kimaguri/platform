-- =====================================================
-- Extensible Fields Migration: extension_table_values
-- =====================================================
-- Создание опциональной таблицы для холодных полей
-- Используется при превышении 20 динамических полей в JSONB
-- Применяется в тенантских базах данных

-- Создание таблицы extension_table_values
CREATE TABLE IF NOT EXISTS extension_table_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_table VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    field_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации производительности
CREATE INDEX IF NOT EXISTS idx_extension_values_tenant_table_entity 
ON extension_table_values (tenant_id, entity_table, entity_id);

CREATE INDEX IF NOT EXISTS idx_extension_values_entity_table 
ON extension_table_values (entity_table);

CREATE INDEX IF NOT EXISTS idx_extension_values_entity_id 
ON extension_table_values (entity_id);

-- GIN индекс для JSONB поиска
CREATE INDEX IF NOT EXISTS idx_extension_values_field_data_gin 
ON extension_table_values USING GIN (field_data);

-- Функциональные индексы для часто используемых полей (примеры)
-- Эти индексы создаются динамически на основе метаданных из админской БД
-- CREATE INDEX IF NOT EXISTS idx_extension_values_specific_field 
-- ON extension_table_values ((field_data->>'field_name'));

-- Ограничения
ALTER TABLE extension_table_values 
ADD CONSTRAINT extension_values_tenant_entity_unique 
UNIQUE (tenant_id, entity_table, entity_id);

-- Комментарии
COMMENT ON TABLE extension_table_values IS 'Хранение холодных расширяемых полей при превышении лимита JSONB';
COMMENT ON COLUMN extension_table_values.tenant_id IS 'ID тенанта';
COMMENT ON COLUMN extension_table_values.entity_table IS 'Название таблицы сущности (users, leads, etc.)';
COMMENT ON COLUMN extension_table_values.entity_id IS 'ID записи в таблице сущности';
COMMENT ON COLUMN extension_table_values.field_data IS 'JSONB с холодными полями';

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_extension_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_extension_values_updated_at
    BEFORE UPDATE ON extension_table_values
    FOR EACH ROW
    EXECUTE FUNCTION update_extension_values_updated_at();

-- =====================================================
-- Вспомогательные функции для работы с extension_table_values
-- =====================================================

-- Функция для получения всех расширяемых полей (JSONB + extension_table_values)
CREATE OR REPLACE FUNCTION get_all_extension_fields(
    p_tenant_id UUID,
    p_entity_table VARCHAR,
    p_entity_id UUID
) RETURNS JSONB AS $$
DECLARE
    jsonb_fields JSONB;
    extension_fields JSONB;
    result JSONB;
BEGIN
    -- Получаем поля из JSONB столбца custom_fields
    EXECUTE format('SELECT custom_fields FROM %I WHERE tenant_id = $1 AND id = $2', p_entity_table)
    INTO jsonb_fields
    USING p_tenant_id, p_entity_id;
    
    -- Получаем поля из extension_table_values
    SELECT field_data INTO extension_fields
    FROM extension_table_values
    WHERE tenant_id = p_tenant_id 
    AND entity_table = p_entity_table 
    AND entity_id = p_entity_id;
    
    -- Объединяем поля (extension_table_values имеет приоритет)
    result := COALESCE(jsonb_fields, '{}'::JSONB) || COALESCE(extension_fields, '{}'::JSONB);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Функция для сохранения расширяемых полей с автоматическим разделением
CREATE OR REPLACE FUNCTION save_extension_fields(
    p_tenant_id UUID,
    p_entity_table VARCHAR,
    p_entity_id UUID,
    p_fields JSONB,
    p_hot_fields_limit INTEGER DEFAULT 20
) RETURNS VOID AS $$
DECLARE
    hot_fields JSONB := '{}'::JSONB;
    cold_fields JSONB := '{}'::JSONB;
    field_key TEXT;
    field_count INTEGER;
BEGIN
    -- Подсчитываем количество полей
    SELECT jsonb_object_keys_count INTO field_count FROM jsonb_object_keys_count(p_fields);
    
    -- Если полей меньше лимита, сохраняем все в JSONB
    IF field_count <= p_hot_fields_limit THEN
        EXECUTE format('UPDATE %I SET custom_fields = $1 WHERE tenant_id = $2 AND id = $3', p_entity_table)
        USING p_fields, p_tenant_id, p_entity_id;
        
        -- Удаляем из extension_table_values если есть
        DELETE FROM extension_table_values 
        WHERE tenant_id = p_tenant_id 
        AND entity_table = p_entity_table 
        AND entity_id = p_entity_id;
    ELSE
        -- Разделяем поля на горячие и холодные
        -- Горячие поля - первые p_hot_fields_limit полей
        FOR field_key IN SELECT jsonb_object_keys(p_fields) LIMIT p_hot_fields_limit
        LOOP
            hot_fields := hot_fields || jsonb_build_object(field_key, p_fields->field_key);
        END LOOP;
        
        -- Холодные поля - остальные
        FOR field_key IN SELECT jsonb_object_keys(p_fields) OFFSET p_hot_fields_limit
        LOOP
            cold_fields := cold_fields || jsonb_build_object(field_key, p_fields->field_key);
        END LOOP;
        
        -- Сохраняем горячие поля в JSONB
        EXECUTE format('UPDATE %I SET custom_fields = $1 WHERE tenant_id = $2 AND id = $3', p_entity_table)
        USING hot_fields, p_tenant_id, p_entity_id;
        
        -- Сохраняем холодные поля в extension_table_values
        INSERT INTO extension_table_values (tenant_id, entity_table, entity_id, field_data)
        VALUES (p_tenant_id, p_entity_table, p_entity_id, cold_fields)
        ON CONFLICT (tenant_id, entity_table, entity_id)
        DO UPDATE SET 
            field_data = EXCLUDED.field_data,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Примеры использования
-- =====================================================

-- Получение всех расширяемых полей для пользователя
-- SELECT get_all_extension_fields('tenant-uuid', 'users', 'user-uuid');

-- Сохранение расширяемых полей с автоматическим разделением
-- SELECT save_extension_fields('tenant-uuid', 'users', 'user-uuid', '{"field1": "value1", "field2": "value2", ...}');

-- Поиск по расширяемым полям (с JOIN на extension_table_values)
-- SELECT u.*, 
--        u.custom_fields as hot_fields,
--        etv.field_data as cold_fields,
--        get_all_extension_fields(u.tenant_id, 'users', u.id) as all_fields
-- FROM users u
-- LEFT JOIN extension_table_values etv ON etv.tenant_id = u.tenant_id 
--                                      AND etv.entity_table = 'users' 
--                                      AND etv.entity_id = u.id
-- WHERE u.tenant_id = 'tenant-uuid'
--   AND (u.custom_fields->>'field_name' = 'value' 
--        OR etv.field_data->>'field_name' = 'value');

-- =====================================================
-- Очистка и откат (для разработки)
-- =====================================================

-- Удаление таблицы и связанных объектов (осторожно!)
-- DROP TRIGGER IF EXISTS trigger_extension_values_updated_at ON extension_table_values;
-- DROP FUNCTION IF EXISTS update_extension_values_updated_at();
-- DROP FUNCTION IF EXISTS get_all_extension_fields(UUID, VARCHAR, UUID);
-- DROP FUNCTION IF EXISTS save_extension_fields(UUID, VARCHAR, UUID, JSONB, INTEGER);
-- DROP TABLE IF EXISTS extension_table_values; 