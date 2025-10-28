-- Add two_factor_enabled field to users table
-- This field will be used for per-user 2FA settings in the ProfileManager

-- Add two_factor_enabled column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether two-factor authentication is enabled for this user';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);
