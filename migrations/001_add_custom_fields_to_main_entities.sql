-- Migration: Add custom_fields JSONB columns to main entities
-- Project: helpdev-new-supabase
-- Description: Adds custom_fields JSONB column to core entities for extensible fields functionality

-- Add custom_fields to clients table
ALTER TABLE clients ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Add custom_fields to projects table  
ALTER TABLE projects ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Add custom_fields to activities table
ALTER TABLE activities ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Add custom_fields to employee table
ALTER TABLE employee ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Note: lead table already has dynamic_attributes JSONB column
-- This can be optionally renamed to custom_fields for consistency in a separate migration 