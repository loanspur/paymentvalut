-- Enhance user management with role-based access control and activity tracking
-- This migration adds new features without breaking existing functionality

-- Add new role types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enhanced_user_role') THEN
        CREATE TYPE enhanced_user_role AS ENUM ('admin', 'partner', 'operator', 'viewer');
    END IF;
END $$;

-- Add new columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'partner';

-- Create user activities table for tracking
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user permissions table for fine-grained control
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- Insert default admin user if not exists
INSERT INTO users (email, password_hash, role, is_active, must_change_password)
SELECT 'admin@mpesavault.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true, false
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@mpesavault.com');

-- Create RLS policies for user activities
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Admins can see all activities
CREATE POLICY "Admins can view all activities" ON user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = user_activities.user_id 
            AND users.role = 'admin'
        )
    );

-- Users can see their own activities
CREATE POLICY "Users can view own activities" ON user_activities
    FOR SELECT USING (user_id = auth.uid());

-- Create RLS policies for user permissions
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can manage all permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = user_permissions.user_id 
            AND users.role = 'admin'
        )
    );

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());
