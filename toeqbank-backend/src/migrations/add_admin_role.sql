-- Add is_admin column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for quick filtering of admins
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Update huckfinne user to be admin
UPDATE users SET is_admin = TRUE, is_reviewer = TRUE WHERE username = 'huckfinne';