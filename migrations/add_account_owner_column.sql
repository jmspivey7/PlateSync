-- Add is_account_owner column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_account_owner boolean DEFAULT false;

-- Update existing records - set the user with churchId equal to their id as Account Owner
UPDATE users 
SET is_account_owner = true 
WHERE id = church_id;