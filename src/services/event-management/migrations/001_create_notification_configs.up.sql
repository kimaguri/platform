-- Migration: Create notification_configs table in admin DB
-- This table stores notification settings and templates for all tenants

CREATE TABLE IF NOT EXISTS notification_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    webhook_enabled BOOLEAN NOT NULL DEFAULT false,
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    templates JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key to tenants table
    CONSTRAINT fk_tenant 
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE,
    
    -- Ensure one config per tenant
    CONSTRAINT unique_tenant_config 
        UNIQUE (tenant_id)
);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_notification_configs_tenant_id 
    ON notification_configs(tenant_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_notification_configs_updated_at 
    BEFORE UPDATE ON notification_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
