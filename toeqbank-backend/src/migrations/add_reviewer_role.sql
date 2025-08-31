-- Add is_reviewer column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_reviewer BOOLEAN DEFAULT FALSE;

-- Create index for quick filtering of reviewers
CREATE INDEX IF NOT EXISTS idx_users_is_reviewer ON users(is_reviewer) WHERE is_reviewer = true;