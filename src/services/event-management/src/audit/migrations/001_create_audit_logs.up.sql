-- Создание таблицы для аудит-логов конвертации
CREATE TABLE conversion_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Индексы для быстрого поиска
    CONSTRAINT fk_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_audit_logs_tenant_id ON conversion_audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_event_type ON conversion_audit_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON conversion_audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON conversion_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON conversion_audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_id ON conversion_audit_logs(event_id);

-- Индекс для поиска по деталям (JSONB)
CREATE INDEX idx_audit_logs_details_gin ON conversion_audit_logs USING GIN (details);

-- Партиционирование по месяцам для больших объемов данных
-- (можно включить позже при необходимости)
-- CREATE TABLE conversion_audit_logs_y2024m01 PARTITION OF conversion_audit_logs
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Триггер для автоматического обновления timestamp
CREATE OR REPLACE FUNCTION update_audit_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.timestamp = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер только для обновлений (не для вставок)
-- CREATE TRIGGER trigger_update_audit_log_timestamp
--     BEFORE UPDATE ON conversion_audit_logs
--     FOR EACH ROW
--     EXECUTE FUNCTION update_audit_log_timestamp();
