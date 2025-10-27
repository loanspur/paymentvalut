-- Create user management system with admin and partner roles
-- This migration sets up the foundation for multi-tenant user management

-- Create user roles enum (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'partner');
    END IF;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'partner',
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partner_shortcodes table to support multiple shortcodes per partner
CREATE TABLE IF NOT EXISTS partner_shortcodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    shortcode VARCHAR(20) NOT NULL,
    shortcode_name VARCHAR(100) NOT NULL,
    mpesa_consumer_key VARCHAR(255),
    mpesa_consumer_secret VARCHAR(255),
    mpesa_passkey VARCHAR(255),
    mpesa_initiator_name VARCHAR(100),
    mpesa_initiator_password VARCHAR(255),
    mpesa_environment VARCHAR(20) DEFAULT 'sandbox',
    is_mpesa_configured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique shortcode per partner
    UNIQUE(partner_id, shortcode)
);

-- Create user permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    
    -- Ensure unique permission per user per resource
    UNIQUE(user_id, permission, resource_type, resource_id)
);

-- Create audit log table for tracking user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_shortcodes_partner_id ON partner_shortcodes(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_shortcodes_shortcode ON partner_shortcodes(shortcode);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_users_updated_at'
        AND event_object_table = 'users'
    ) THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created update_users_updated_at trigger';
    ELSE
        RAISE NOTICE 'update_users_updated_at trigger already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_partner_shortcodes_updated_at'
        AND event_object_table = 'partner_shortcodes'
    ) THEN
        CREATE TRIGGER update_partner_shortcodes_updated_at BEFORE UPDATE ON partner_shortcodes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created update_partner_shortcodes_updated_at trigger';
    ELSE
        RAISE NOTICE 'update_partner_shortcodes_updated_at trigger already exists';
    END IF;
END $$;

-- Create function to log user actions
CREATE OR REPLACE FUNCTION log_user_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the action
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.created_by, NEW.updated_by),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create RLS policies for data isolation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_shortcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Skip policy creation to avoid conflicts
-- Policies will be created separately if needed

-- Create default admin user (password: admin123 - should be changed immediately)
INSERT INTO users (email, password_hash, role, is_active) VALUES 
('admin@mpesavault.com', '$2b$10$NiZIoyI7wYSdX5DWCNO.FuBoxWEiOL0besq4PNqWyhX/WFTiXXhxS', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE partner_shortcodes IS 'Multiple M-Pesa shortcodes per partner';
COMMENT ON TABLE user_permissions IS 'Fine-grained permissions for users';
COMMENT ON TABLE audit_logs IS 'Audit trail for all user actions';

COMMENT ON COLUMN users.role IS 'User role: admin or partner';
COMMENT ON COLUMN users.partner_id IS 'Partner ID for partner users (NULL for admin)';
COMMENT ON COLUMN partner_shortcodes.shortcode_name IS 'Human-readable name for the shortcode';
-- COMMENT ON COLUMN user_permissions.permission IS 'Permission name (e.g., read, write, delete)';
-- COMMENT ON COLUMN user_permissions.resource_type IS 'Type of resource (e.g., disbursement, partner)';
-- COMMENT ON COLUMN user_permissions.resource_id IS 'Specific resource ID (NULL for global permissions)';
