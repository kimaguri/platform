-- Migration: Rename lead.dynamic_attributes to custom_fields (OPTIONAL)
-- Project: helpdev-new-supabase  
-- Description: Renames dynamic_attributes column to custom_fields for consistency
-- WARNING: This is an optional migration - run only if consistency is required

-- Rename the column for consistency with other entities
ALTER TABLE lead RENAME COLUMN dynamic_attributes TO custom_fields;

-- Note: This migration ensures all main entities use the same column name
-- If you prefer to keep dynamic_attributes, skip this migration and update
-- the application code to handle both column names appropriately 