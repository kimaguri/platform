-- Migration: Create entity_conversion_rules table
-- Project: simplx-platform
-- Description: Creates the entity_conversion_rules table for storing conversion rules in the admin database

-- Create the entity_conversion_rules table
CREATE TABLE IF NOT EXISTS entity_conversion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source_entity VARCHAR(100) NOT NULL,
  target_entity VARCHAR(100) NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  field_mapping JSONB NOT NULL DEFAULT '{}',
  extension_field_mapping JSONB NOT NULL DEFAULT '{}',
  conversion_settings JSONB NOT NULL DEFAULT '{}',
  target_name_template VARCHAR(255),
  default_values JSONB NOT NULL DEFAULT '{}',
  approval_settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_entity_conversion_rules_tenant_id ON entity_conversion_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_entity_conversion_rules_source_entity ON entity_conversion_rules (source_entity);
CREATE INDEX IF NOT EXISTS idx_entity_conversion_rules_target_entity ON entity_conversion_rules (target_entity);
CREATE INDEX IF NOT EXISTS idx_entity_conversion_rules_is_active ON entity_conversion_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_entity_conversion_rules_created_at ON entity_conversion_rules (created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_entity_conversion_rules_updated_at
BEFORE UPDATE ON entity_conversion_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comment to describe the table
COMMENT ON TABLE entity_conversion_rules IS 'Stores entity conversion rules for the SimplX platform';
