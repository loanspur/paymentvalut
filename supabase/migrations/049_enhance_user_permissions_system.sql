-- Enhanced User Permissions System
-- This migration adds comprehensive role-based permissions and shortcode access control

-- First, create the user_role enum if it doesn't exist
DO $$ 
BEGIN
    -- Create user_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'partner', 'user');
    END IF;
    
    -- Add new user roles if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'super_admin';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'operator';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'viewer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'viewer';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'partner_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'partner_admin';
    END IF;
END $$;

-- Create user_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL, -- 'read', 'write', 'delete', 'admin'
    resource_type VARCHAR(50) NOT NULL, -- 'disbursements', 'partners', 'users', 'transactions', 'balance_monitoring'
    resource_id UUID, -- Specific resource ID (optional, for resource-specific permissions)
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique permission per user/resource combination
    UNIQUE(user_id, permission_type, resource_type, resource_id)
);

-- Create user_shortcode_access table for shortcode-specific permissions
CREATE TABLE IF NOT EXISTS user_shortcode_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shortcode_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    access_level VARCHAR(20) NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique access per user/shortcode combination
    UNIQUE(user_id, shortcode_id)
);

-- Create role_permissions table for default role-based permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role user_role NOT NULL,
    permission_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    is_granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique permission per role/resource combination
    UNIQUE(role, permission_type, resource_type)
);

-- Add additional columns to users table for enhanced management
DO $$ 
BEGIN
    -- Add first_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
    END IF;
    
    -- Add last_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
    END IF;
    
    -- Add phone_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
    END IF;
    
    -- Add department column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notes') THEN
        ALTER TABLE users ADD COLUMN notes TEXT;
    END IF;
    
    -- Add last_activity_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_activity_at') THEN
        ALTER TABLE users ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add password_reset_token column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_reset_token') THEN
        ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
    END IF;
    
    -- Add password_reset_expires column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_reset_expires') THEN
        ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;
    
    -- Add email_verification_token column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verification_token') THEN
        ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_shortcode_access_user_id ON user_shortcode_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shortcode_access_shortcode_id ON user_shortcode_access(shortcode_id);
CREATE INDEX IF NOT EXISTS idx_user_shortcode_access_active ON user_shortcode_access(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_type, resource_type, is_granted) VALUES
-- Super Admin - Full access to everything
('super_admin', 'read', 'disbursements', true),
('super_admin', 'write', 'disbursements', true),
('super_admin', 'delete', 'disbursements', true),
('super_admin', 'admin', 'disbursements', true),
('super_admin', 'read', 'partners', true),
('super_admin', 'write', 'partners', true),
('super_admin', 'delete', 'partners', true),
('super_admin', 'admin', 'partners', true),
('super_admin', 'read', 'users', true),
('super_admin', 'write', 'users', true),
('super_admin', 'delete', 'users', true),
('super_admin', 'admin', 'users', true),
('super_admin', 'read', 'transactions', true),
('super_admin', 'write', 'transactions', true),
('super_admin', 'delete', 'transactions', true),
('super_admin', 'admin', 'transactions', true),
('super_admin', 'read', 'balance_monitoring', true),
('super_admin', 'write', 'balance_monitoring', true),
('super_admin', 'delete', 'balance_monitoring', true),
('super_admin', 'admin', 'balance_monitoring', true),

-- Admin - Full access except user management
('admin', 'read', 'disbursements', true),
('admin', 'write', 'disbursements', true),
('admin', 'delete', 'disbursements', true),
('admin', 'admin', 'disbursements', true),
('admin', 'read', 'partners', true),
('admin', 'write', 'partners', true),
('admin', 'delete', 'partners', true),
('admin', 'admin', 'partners', true),
('admin', 'read', 'users', true),
('admin', 'write', 'users', true),
('admin', 'delete', 'users', false), -- Cannot delete users
('admin', 'admin', 'users', false), -- Cannot admin users
('admin', 'read', 'transactions', true),
('admin', 'write', 'transactions', true),
('admin', 'delete', 'transactions', true),
('admin', 'admin', 'transactions', true),
('admin', 'read', 'balance_monitoring', true),
('admin', 'write', 'balance_monitoring', true),
('admin', 'delete', 'balance_monitoring', true),
('admin', 'admin', 'balance_monitoring', true),

-- Partner Admin - Access to their partner's data only
('partner_admin', 'read', 'disbursements', true),
('partner_admin', 'write', 'disbursements', true),
('partner_admin', 'delete', 'disbursements', false),
('partner_admin', 'admin', 'disbursements', false),
('partner_admin', 'read', 'partners', true),
('partner_admin', 'write', 'partners', false),
('partner_admin', 'delete', 'partners', false),
('partner_admin', 'admin', 'partners', false),
('partner_admin', 'read', 'users', false),
('partner_admin', 'write', 'users', false),
('partner_admin', 'delete', 'users', false),
('partner_admin', 'admin', 'users', false),
('partner_admin', 'read', 'transactions', true),
('partner_admin', 'write', 'transactions', true),
('partner_admin', 'delete', 'transactions', false),
('partner_admin', 'admin', 'transactions', false),
('partner_admin', 'read', 'balance_monitoring', true),
('partner_admin', 'write', 'balance_monitoring', false),
('partner_admin', 'delete', 'balance_monitoring', false),
('partner_admin', 'admin', 'balance_monitoring', false),

-- Operator - Limited access to operations
('operator', 'read', 'disbursements', true),
('operator', 'write', 'disbursements', true),
('operator', 'delete', 'disbursements', false),
('operator', 'admin', 'disbursements', false),
('operator', 'read', 'partners', true),
('operator', 'write', 'partners', false),
('operator', 'delete', 'partners', false),
('operator', 'admin', 'partners', false),
('operator', 'read', 'users', false),
('operator', 'write', 'users', false),
('operator', 'delete', 'users', false),
('operator', 'admin', 'users', false),
('operator', 'read', 'transactions', true),
('operator', 'write', 'transactions', false),
('operator', 'delete', 'transactions', false),
('operator', 'admin', 'transactions', false),
('operator', 'read', 'balance_monitoring', true),
('operator', 'write', 'balance_monitoring', false),
('operator', 'delete', 'balance_monitoring', false),
('operator', 'admin', 'balance_monitoring', false),

-- Viewer - Read-only access
('viewer', 'read', 'disbursements', true),
('viewer', 'write', 'disbursements', false),
('viewer', 'delete', 'disbursements', false),
('viewer', 'admin', 'disbursements', false),
('viewer', 'read', 'partners', true),
('viewer', 'write', 'partners', false),
('viewer', 'delete', 'partners', false),
('viewer', 'admin', 'partners', false),
('viewer', 'read', 'users', false),
('viewer', 'write', 'users', false),
('viewer', 'delete', 'users', false),
('viewer', 'admin', 'users', false),
('viewer', 'read', 'transactions', true),
('viewer', 'write', 'transactions', false),
('viewer', 'delete', 'transactions', false),
('viewer', 'admin', 'transactions', false),
('viewer', 'read', 'balance_monitoring', true),
('viewer', 'write', 'balance_monitoring', false),
('viewer', 'delete', 'balance_monitoring', false),
('viewer', 'admin', 'balance_monitoring', false),

-- Partner - Basic partner access (legacy)
('partner', 'read', 'disbursements', true),
('partner', 'write', 'disbursements', true),
('partner', 'delete', 'disbursements', false),
('partner', 'admin', 'disbursements', false),
('partner', 'read', 'partners', true),
('partner', 'write', 'partners', false),
('partner', 'delete', 'partners', false),
('partner', 'admin', 'partners', false),
('partner', 'read', 'users', false),
('partner', 'write', 'users', false),
('partner', 'delete', 'users', false),
('partner', 'admin', 'users', false),
('partner', 'read', 'transactions', true),
('partner', 'write', 'transactions', false),
('partner', 'delete', 'transactions', false),
('partner', 'admin', 'transactions', false),
('partner', 'read', 'balance_monitoring', true),
('partner', 'write', 'balance_monitoring', false),
('partner', 'delete', 'balance_monitoring', false),
('partner', 'admin', 'balance_monitoring', false)

ON CONFLICT (role, permission_type, resource_type) DO NOTHING;

-- Create a function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission_type VARCHAR(50),
    p_resource_type VARCHAR(50),
    p_resource_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_name user_role;
    has_permission BOOLEAN := false;
BEGIN
    -- Get user's role
    SELECT role INTO user_role_name FROM users WHERE id = p_user_id AND is_active = true;
    
    IF user_role_name IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has specific permission (overrides role permissions)
    SELECT EXISTS(
        SELECT 1 FROM user_permissions 
        WHERE user_id = p_user_id 
        AND permission_type = p_permission_type 
        AND resource_type = p_resource_type 
        AND (resource_id = p_resource_id OR resource_id IS NULL)
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO has_permission;
    
    -- If specific permission exists, return it
    IF has_permission IS NOT NULL THEN
        RETURN has_permission;
    END IF;
    
    -- Otherwise, check role-based permissions
    SELECT is_granted INTO has_permission
    FROM role_permissions 
    WHERE role = user_role_name 
    AND permission_type = p_permission_type 
    AND resource_type = p_resource_type;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user's accessible shortcodes
CREATE OR REPLACE FUNCTION get_user_accessible_shortcodes(p_user_id UUID)
RETURNS TABLE(shortcode_id UUID, shortcode_name VARCHAR, short_code VARCHAR, access_level VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as shortcode_id,
        p.name as shortcode_name,
        p.short_code,
        usa.access_level
    FROM user_shortcode_access usa
    JOIN partners p ON usa.shortcode_id = p.id
    WHERE usa.user_id = p_user_id 
    AND usa.is_active = true
    AND (usa.expires_at IS NULL OR usa.expires_at > NOW())
    AND p.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE user_permissions IS 'Granular permissions for individual users';
COMMENT ON TABLE user_shortcode_access IS 'Shortcode-specific access control for users';
COMMENT ON TABLE role_permissions IS 'Default permissions for each user role';
COMMENT ON FUNCTION check_user_permission IS 'Check if a user has a specific permission';
COMMENT ON FUNCTION get_user_accessible_shortcodes IS 'Get all shortcodes a user has access to';

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_permissions_updated_at') THEN
        CREATE TRIGGER update_user_permissions_updated_at 
            BEFORE UPDATE ON user_permissions 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_shortcode_access_updated_at') THEN
        CREATE TRIGGER update_user_shortcode_access_updated_at 
            BEFORE UPDATE ON user_shortcode_access 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_role_permissions_updated_at') THEN
        CREATE TRIGGER update_role_permissions_updated_at 
            BEFORE UPDATE ON role_permissions 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Update existing users table trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
