-- Создание таблицы entity_conversion_rules в админской БД (simplx_crm_tenant)
-- Основана на архитектуре extension_field_definitions с расширениями для конвертации

CREATE TABLE entity_conversion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Основная информация о правиле
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Сущности для конвертации
    source_entity VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    
    -- Условия срабатывания (поддержка сложных логических выражений)
    trigger_conditions JSONB DEFAULT '{}',
    -- Примеры trigger_conditions:
    -- {"and": [{"field": "status", "operator": "eq", "value": "qualified"}, {"field": "source", "operator": "eq", "value": "website"}]}
    -- {"or": [{"field": "score", "operator": "gte", "value": 80}, {"field": "priority", "operator": "eq", "value": "high"}]}
    
    -- Маппинг полей (основные поля сущности)
    field_mapping JSONB DEFAULT '{}',
    -- Пример field_mapping:
    -- {"name": "company_name", "email": "contact_email", "phone": "contact_phone"}
    
    -- Маппинг расширяемых полей (extension fields)
    extension_field_mapping JSONB DEFAULT '{}',
    -- Пример extension_field_mapping:
    -- {"lead_source": "client_source", "lead_score": "client_rating"}
    
    -- Настройки конвертации
    conversion_settings JSONB DEFAULT '{}',
    -- Пример conversion_settings:
    -- {
    --   "preserve_source": true,
    --   "allow_rollback": false,
    --   "copy_activities": false,
    --   "copy_watchers": false,
    --   "auto_conversion_enabled": true,
    --   "manual_conversion_enabled": true
    -- }
    
    -- Шаблоны и значения по умолчанию для целевой сущности
    target_name_template TEXT,
    -- Пример: "Client: {source.name} - {source.company}"
    
    default_values JSONB DEFAULT '{}',
    -- Пример default_values:
    -- {"status": "new", "priority": "medium", "assigned_to": null}
    
    -- Настройки для будущей интеграции с Proo Business Logics
    approval_settings JSONB DEFAULT '{}',
    -- Пример approval_settings:
    -- {
    --   "requires_approval": false,
    --   "approval_roles": ["manager", "admin"],
    --   "approval_workflow_id": null
    -- }
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Ограничения
    UNIQUE(tenant_id, name),
    CONSTRAINT valid_entities CHECK (source_entity != target_entity)
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_entity_conversion_rules_tenant_id ON entity_conversion_rules(tenant_id);
CREATE INDEX idx_entity_conversion_rules_source_entity ON entity_conversion_rules(source_entity);
CREATE INDEX idx_entity_conversion_rules_target_entity ON entity_conversion_rules(target_entity);
CREATE INDEX idx_entity_conversion_rules_active ON entity_conversion_rules(is_active);
CREATE INDEX idx_entity_conversion_rules_tenant_source ON entity_conversion_rules(tenant_id, source_entity);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_entity_conversion_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entity_conversion_rules_updated_at
    BEFORE UPDATE ON entity_conversion_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_conversion_rules_updated_at();

-- Комментарии для документации
COMMENT ON TABLE entity_conversion_rules IS 'Правила автоматической конвертации сущностей между различными типами (Lead -> Client, Contact -> Lead, etc.)';
COMMENT ON COLUMN entity_conversion_rules.trigger_conditions IS 'JSON с условиями срабатывания правила (поддержка AND/OR логики)';
COMMENT ON COLUMN entity_conversion_rules.field_mapping IS 'JSON маппинг основных полей между source и target сущностями';
COMMENT ON COLUMN entity_conversion_rules.extension_field_mapping IS 'JSON маппинг расширяемых полей (extension fields) между сущностями';
COMMENT ON COLUMN entity_conversion_rules.conversion_settings IS 'JSON с настройками процесса конвертации';
COMMENT ON COLUMN entity_conversion_rules.approval_settings IS 'JSON с настройками системы одобрений (для будущей интеграции с Proo Business Logics)';
