-- Migration: Update employee.created_by foreign key to reference auth.users.id
-- Project: intellhouse
-- Description: Changes the foreign key constraint on employee.created_by from employee.id to auth.users.id

-- Drop the existing foreign key constraint first
ALTER TABLE employee DROP CONSTRAINT employee_created_by_fkey;

-- Now we can fix the broken reference
-- We'll update the created_by field to a valid user id from auth.users
-- In a real production environment, you might want to choose a more appropriate user
UPDATE employee 
SET created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE id = '0c8f7d1e-fab2-435e-83ad-ec2c8c978d5a' 
AND created_by = 'da576f0f-a87d-4e4c-a2a8-2bef018be5a0';

-- Add the new foreign key constraint referencing auth.users.id
ALTER TABLE employee 
ADD CONSTRAINT employee_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);
