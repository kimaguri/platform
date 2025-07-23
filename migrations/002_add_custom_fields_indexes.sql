-- Migration: Add GIN indexes for custom_fields JSONB columns
-- Project: helpdev-new-supabase
-- Description: Creates GIN indexes for efficient JSONB operations on custom_fields

-- GIN index for clients.custom_fields
CREATE INDEX idx_clients_custom_fields_gin ON clients USING GIN (custom_fields);

-- GIN index for projects.custom_fields
CREATE INDEX idx_projects_custom_fields_gin ON projects USING GIN (custom_fields);

-- GIN index for activities.custom_fields
CREATE INDEX idx_activities_custom_fields_gin ON activities USING GIN (custom_fields);

-- GIN index for employee.custom_fields
CREATE INDEX idx_employee_custom_fields_gin ON employee USING GIN (custom_fields);

-- GIN index for lead.dynamic_attributes (existing field)
CREATE INDEX idx_lead_dynamic_attributes_gin ON lead USING GIN (dynamic_attributes);

-- Note: These indexes enable efficient filtering and searching within JSONB columns
-- For frequently accessed specific fields, additional B-Tree indexes can be created:
-- CREATE INDEX idx_clients_custom_department ON clients ((custom_fields->>'department'));
-- CREATE INDEX idx_employee_custom_skill_level ON employee ((custom_fields->>'skill_level')); 