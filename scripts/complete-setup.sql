-- Complete setup script for M-Pesa Vault User Management
-- This script will create everything needed for the system to work

-- Step 1: Create user roles enum (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'partner');
        RAISE NOTICE 'Created user_role enum type';
    ELSE
        RAISE NOTICE 'user_role enum type already exists';
    END IF;
END $$;

-- Step 2: Create users table (if it doesn't exist)
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

-- Step 3: Create user sessions table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create partner shortcodes table (if it doesn't exist)
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

-- Step 5: Create audit logs table (if it doesn't exist)
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

-- Step 6: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_partner_shortcodes_partner_id ON partner_shortcodes(partner_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Step 7: Enable Row Level Security (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_shortcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Partners can view own and partner data" ON users;
DROP POLICY IF EXISTS "Partners can view own shortcodes" ON partner_shortcodes;
DROP POLICY IF EXISTS "Admins can view all shortcodes" ON partner_shortcodes;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Audit logs access" ON audit_logs;

-- Step 9: Create RLS policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Partners can view own and partner data" ON users
    FOR SELECT USING (
        id = auth.uid() OR 
        (partner_id IS NOT NULL AND partner_id = (
            SELECT partner_id FROM users WHERE id = auth.uid()
        ))
    );

CREATE POLICY "Partners can view own shortcodes" ON partner_shortcodes
    FOR ALL USING (
        partner_id = (
            SELECT partner_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all shortcodes" ON partner_shortcodes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Audit logs access" ON audit_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 10: Create default admin user
INSERT INTO users (email, password_hash, role, is_active) VALUES 
('admin@mpesavault.com', '$2b$10$NiZIoyI7wYSdX5DWCNO.FuBoxWEiOL0besq4PNqWyhX/WFTiXXhxS', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Step 11: Verify everything was created
SELECT 'Tables created successfully!' as status;

-- Check if admin user exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE email = 'admin@mpesavault.com') 
        THEN 'Admin user exists ✅'
        ELSE 'Admin user NOT found ❌'
    END as admin_status;

-- Show admin user details
SELECT 
    id,
    email, 
    role, 
    is_active, 
    created_at 
FROM users 
WHERE email = 'admin@mpesavault.com';

-- Final success message
SELECT '🎉 M-Pesa Vault User Management System setup completed successfully!' as final_status;
