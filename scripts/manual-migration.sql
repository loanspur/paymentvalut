-- Manual Migration Script for User Management System
-- Run this in your Supabase SQL Editor if CLI is not available

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
    session_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partner shortcodes table for multiple shortcodes per partner
CREATE TABLE IF NOT EXISTS partner_shortcodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    shortcode VARCHAR(20) NOT NULL,
    initiator_name VARCHAR(100) NOT NULL,
    initiator_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, shortcode)
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_partner_shortcodes_partner_id ON partner_shortcodes(partner_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_shortcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Partners can view own and partner data" ON users;
DROP POLICY IF EXISTS "Partners can view own shortcodes" ON partner_shortcodes;
DROP POLICY IF EXISTS "Admins can view all shortcodes" ON partner_shortcodes;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Audit logs access" ON audit_logs;

-- RLS Policy: Users can view their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (id = auth.uid());

-- RLS Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (id = auth.uid());

-- RLS Policy: Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: Admins can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: Partners can view their own data and their partner's data
CREATE POLICY "Partners can view own and partner data" ON users
    FOR SELECT USING (
        id = auth.uid() OR 
        (partner_id IS NOT NULL AND partner_id = (
            SELECT partner_id FROM users WHERE id = auth.uid()
        ))
    );

-- RLS Policy: Partner shortcodes - partners can only see their own
CREATE POLICY "Partners can view own shortcodes" ON partner_shortcodes
    FOR ALL USING (
        partner_id = (
            SELECT partner_id FROM users WHERE id = auth.uid()
        )
    );

-- RLS Policy: Admins can view all shortcodes
CREATE POLICY "Admins can view all shortcodes" ON partner_shortcodes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: User sessions - users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR ALL USING (user_id = auth.uid());

-- RLS Policy: Audit logs - admins can view all, users can view their own
CREATE POLICY "Audit logs access" ON audit_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create default admin user (password: admin123 - should be changed immediately)
INSERT INTO users (email, password_hash, role, is_active) VALUES 
('admin@mpesavault.com', '$2b$10$NiZIoyI7wYSdX5DWCNO.FuBoxWEiOL0besq4PNqWyhX/WFTiXXhxS', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE partner_shortcodes IS 'Multiple M-Pesa shortcodes per partner';
COMMENT ON TABLE audit_logs IS 'System audit trail for security and compliance';

-- Success message
SELECT 'User management system migration completed successfully!' as status;
