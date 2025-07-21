-- =================================================================
-- Схема базы данных для административного проекта simplx_crm_tenant
-- =================================================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =================================================================
-- 1. ОСНОВНАЯ ТАБЛИЦА ТЕНАНТОВ
-- =================================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Основная информация
    tenant_id VARCHAR(50) UNIQUE NOT NULL, -- Уникальный идентификатор (например, "jogzbtwfzlzroccnfjye")
    name VARCHAR(255) NOT NULL, -- Название организации
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly название (например, "helpdev")
    
    -- Статус
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    
    -- Контактная информация
    contact_email VARCHAR(255),
    contact_name VARCHAR(255),
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- ID администратора
    
    -- Дополнительные настройки
    settings JSONB DEFAULT '{}',
    
    -- Индексы
    CONSTRAINT tenant_id_format CHECK (tenant_id ~ '^[a-z0-9]{20}$'),
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- =================================================================
-- 2. КОНФИГУРАЦИИ SUPABASE ПРОЕКТОВ
-- =================================================================

CREATE TABLE tenant_supabase_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Supabase проект
    supabase_project_id VARCHAR(50) NOT NULL, -- ID проекта в Supabase
    supabase_url VARCHAR(255) NOT NULL,
    
    -- Ключи (зашифрованы)
    anon_key TEXT NOT NULL,
    service_key TEXT NOT NULL,
    
    -- Дополнительные настройки
    region VARCHAR(50) DEFAULT 'us-east-1',
    plan VARCHAR(20) DEFAULT 'free', -- free, pro, team, enterprise
    
    -- Статус
    is_active BOOLEAN DEFAULT true,
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ограничения
    UNIQUE(tenant_id), -- Один Supabase проект на тенанта
    CONSTRAINT supabase_url_format CHECK (supabase_url ~ '^https://[a-z0-9]+\.supabase\.co$')
);

-- =================================================================
-- 3. НАСТРОЙКИ СУЩНОСТЕЙ И РАСШИРЕНИЙ
-- =================================================================

CREATE TABLE tenant_entity_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Конфигурация сущности
    entity_type VARCHAR(100) NOT NULL, -- contacts, leads, deals, etc.
    entity_name VARCHAR(255) NOT NULL, -- Отображаемое название
    
    -- Настройки
    is_enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}', -- Дополнительные настройки сущности
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ограничения
    UNIQUE(tenant_id, entity_type)
);

-- =================================================================
-- 4. КАСТОМНЫЕ ПОЛЯ (EXTENSIONS)
-- =================================================================

CREATE TABLE tenant_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Привязка к сущности
    entity_type VARCHAR(100) NOT NULL,
    
    -- Конфигурация поля
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('string', 'number', 'boolean', 'date', 'json', 'text', 'email', 'url')),
    
    -- Валидация
    is_required BOOLEAN DEFAULT false,
    default_value JSONB,
    validation_rules JSONB DEFAULT '{}',
    
    -- Настройки отображения
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ограничения
    UNIQUE(tenant_id, entity_type, field_name)
);

-- =================================================================
-- 5. ЛОГИРОВАНИЕ И АУДИТ
-- =================================================================

CREATE TABLE tenant_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Действие
    action VARCHAR(50) NOT NULL, -- created, updated, deleted, activated, suspended
    entity_type VARCHAR(100) NOT NULL, -- tenant, config, field, etc.
    entity_id UUID,
    
    -- Детали
    old_values JSONB,
    new_values JSONB,
    
    -- Пользователь
    performed_by UUID, -- ID администратора
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Дополнительная информация
    ip_address INET,
    user_agent TEXT
);

-- =================================================================
-- 6. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- =================================================================

-- Основные индексы для tenants
CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

-- Индексы для конфигураций
CREATE INDEX idx_supabase_configs_tenant_id ON tenant_supabase_configs(tenant_id);
CREATE INDEX idx_supabase_configs_active ON tenant_supabase_configs(is_active);

-- Индексы для сущностей
CREATE INDEX idx_entity_configs_tenant_id ON tenant_entity_configs(tenant_id);
CREATE INDEX idx_entity_configs_type ON tenant_entity_configs(entity_type);

-- Индексы для кастомных полей
CREATE INDEX idx_custom_fields_tenant_entity ON tenant_custom_fields(tenant_id, entity_type);
CREATE INDEX idx_custom_fields_order ON tenant_custom_fields(display_order);

-- Индексы для аудита
CREATE INDEX idx_audit_tenant_id ON tenant_audit_log(tenant_id);
CREATE INDEX idx_audit_performed_at ON tenant_audit_log(performed_at);
CREATE INDEX idx_audit_action ON tenant_audit_log(action);

-- =================================================================
-- 7. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
-- =================================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггеры
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supabase_configs_updated_at BEFORE UPDATE ON tenant_supabase_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_configs_updated_at BEFORE UPDATE ON tenant_entity_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at BEFORE UPDATE ON tenant_custom_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- 8. RLS (ROW LEVEL SECURITY) - БАЗОВАЯ НАСТРОЙКА
-- =================================================================

-- Включаем RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_supabase_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_entity_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;

-- Базовые политики (можно расширить)
CREATE POLICY "Allow service role full access" ON tenants
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON tenant_supabase_configs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON tenant_entity_configs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON tenant_custom_fields
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON tenant_audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- =================================================================
-- 9. ТЕСТОВЫЕ ДАННЫЕ
-- =================================================================

-- Добавляем тестового тенанта
INSERT INTO tenants (tenant_id, name, slug, contact_email, contact_name, settings) VALUES 
(
    'jogzbtwfzlzroccnfjye', 
    'HelpDev CRM', 
    'helpdev', 
    'admin@helpdev.com', 
    'HelpDev Admin',
    '{"timezone": "UTC", "language": "ru", "features": ["crm", "extensions"]}'
);

-- Добавляем конфигурацию Supabase
INSERT INTO tenant_supabase_configs (tenant_id, supabase_project_id, supabase_url, anon_key, service_key) VALUES 
(
    (SELECT id FROM tenants WHERE tenant_id = 'jogzbtwfzlzroccnfjye'),
    'jogzbtwfzlzroccnfjye',
    'https://jogzbtwfzlzroccnfjye.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZ3pidHdmemx6cm9jY25manllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjQ2MDMsImV4cCI6MjA2NjgwMDYwM30.xBObAmhxDpkiqtMQnjmVZTK-kGPrmoPcvQcsLG5Kzmw',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZ3pidHdmemx6cm9jY25manllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTIyNDYwMywiZXhwIjoyMDY2ODAwNjAzfQ.62ft7PDSOLhcOAPf6E2r61Gl7f4jrsISFoVE8STqgfQ'
);

-- Добавляем базовые сущности
INSERT INTO tenant_entity_configs (tenant_id, entity_type, entity_name, settings) VALUES 
(
    (SELECT id FROM tenants WHERE tenant_id = 'jogzbtwfzlzroccnfjye'),
    'contacts',
    'Контакты',
    '{"icon": "user", "color": "#3B82F6"}'
),
(
    (SELECT id FROM tenants WHERE tenant_id = 'jogzbtwfzlzroccnfjye'),
    'leads',
    'Лиды',
    '{"icon": "target", "color": "#10B981"}'
),
(
    (SELECT id FROM tenants WHERE tenant_id = 'jogzbtwfzlzroccnfjye'),
    'deals',
    'Сделки',
    '{"icon": "briefcase", "color": "#F59E0B"}'
);

-- Добавляем кастомные поля
INSERT INTO tenant_custom_fields (tenant_id, entity_type, field_name, field_label, field_type, is_required, validation_rules) VALUES 
(
    (SELECT id FROM tenants WHERE tenant_id = 'jogzbtwfzlzroccnfjye'),
    'contacts',
    'company_size',
    'Размер компании',
    'string',
    false,
    '{"options": ["1-10", "11-50", "51-200", "200+"]}'
),
(
    (SELECT id FROM tenants WHERE tenant_id = 'jogzbtwfzlzroccnfjye'),
    'leads',
    'lead_score',
    'Оценка лида',
    'number',
    false,
    '{"min": 0, "max": 100}'
);

-- =================================================================
-- 10. ПРЕДСТАВЛЕНИЯ ДЛЯ УДОБСТВА
-- =================================================================

-- Полная информация о тенанте
CREATE VIEW tenant_full_info AS
SELECT 
    t.id,
    t.tenant_id,
    t.name,
    t.slug,
    t.status,
    t.contact_email,
    t.contact_name,
    t.settings as tenant_settings,
    t.created_at,
    t.updated_at,
    
    -- Supabase конфигурация
    sc.supabase_url,
    sc.supabase_project_id,
    sc.region,
    sc.plan,
    sc.is_active as supabase_active,
    
    -- Статистика
    (SELECT COUNT(*) FROM tenant_entity_configs WHERE tenant_id = t.id AND is_enabled = true) as enabled_entities,
    (SELECT COUNT(*) FROM tenant_custom_fields WHERE tenant_id = t.id) as custom_fields_count
    
FROM tenants t
LEFT JOIN tenant_supabase_configs sc ON t.id = sc.tenant_id;

COMMENT ON VIEW tenant_full_info IS 'Полная информация о тенанте включая Supabase конфигурацию и статистику'; 