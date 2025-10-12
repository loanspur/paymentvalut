-- Create user permissions and shortcode access tables
-- This migration sets up the permissions system for user management

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('read', 'write', 'delete', 'admin')),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_shortcode_access table
CREATE TABLE IF NOT EXISTS user_shortcode_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shortcode_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('read', 'write', 'admin')),
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_user_shortcode_access_user_id ON user_shortcode_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shortcode_access_shortcode_id ON user_shortcode_access(shortcode_id);
CREATE INDEX IF NOT EXISTS idx_user_shortcode_access_active ON user_shortcode_access(is_active);

-- Create unique constraints to prevent duplicate permissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_permission 
ON user_permissions(user_id, permission_type, resource_type, resource_id) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_shortcode_access 
ON user_shortcode_access(user_id, shortcode_id) 
WHERE is_active = true;

-- Add RLS policies
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shortcode_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_permissions
CREATE POLICY "Allow service role full access to user_permissions" ON user_permissions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read their own permissions" ON user_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- RLS policies for user_shortcode_access
CREATE POLICY "Allow service role full access to user_shortcode_access" ON user_shortcode_access
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read their own shortcode access" ON user_shortcode_access
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_user_permissions_updated_at 
    BEFORE UPDATE ON user_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_shortcode_access_updated_at 
    BEFORE UPDATE ON user_shortcode_access 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the tables were created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('user_permissions', 'user_shortcode_access')
ORDER BY table_name, ordinal_position;
