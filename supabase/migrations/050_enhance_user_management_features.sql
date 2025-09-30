-- Migration: Enhance User Management Features
-- Add password reset tokens, profile management, and multi-shortcode access

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user sessions table for better session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add profile management columns to users table
DO $$ 
BEGIN
    -- Add profile picture URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_picture_url'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
    END IF;

    -- Add phone number if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number TEXT;
    END IF;

    -- Add department if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        ALTER TABLE users ADD COLUMN department TEXT;
    END IF;

    -- Add notes if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'notes'
    ) THEN
        ALTER TABLE users ADD COLUMN notes TEXT;
    END IF;

    -- Add last password change timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_password_change'
    ) THEN
        ALTER TABLE users ADD COLUMN last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add password change required flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_change_required'
    ) THEN
        ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT false;
    END IF;

    -- Add two-factor authentication columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_factor_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_factor_secret'
    ) THEN
        ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
    END IF;

    RAISE NOTICE 'Successfully added profile management columns to users table';
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Delete expired password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
    
    -- Delete expired sessions
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    RAISE NOTICE 'Cleaned up expired tokens and sessions';
END;
$$ LANGUAGE plpgsql;

-- Create function to generate secure password reset token
CREATE OR REPLACE FUNCTION generate_password_reset_token(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    token_hash TEXT;
    expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate a secure random token
    token := encode(gen_random_bytes(32), 'hex');
    token_hash := encode(digest(token, 'sha256'), 'hex');
    
    -- Set expiration to 1 hour from now
    expires_at := NOW() + INTERVAL '1 hour';
    
    -- Invalidate any existing tokens for this user
    UPDATE password_reset_tokens 
    SET used_at = NOW() 
    WHERE user_id = p_user_id AND used_at IS NULL;
    
    -- Insert new token
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (p_user_id, token_hash, expires_at);
    
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate password reset token
CREATE OR REPLACE FUNCTION validate_password_reset_token(p_token TEXT)
RETURNS TABLE(user_id UUID, is_valid BOOLEAN) AS $$
DECLARE
    token_hash TEXT;
    user_uuid UUID;
    token_expires TIMESTAMP WITH TIME ZONE;
    token_used TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Hash the provided token
    token_hash := encode(digest(p_token, 'sha256'), 'hex');
    
    -- Check if token exists and is valid
    SELECT prt.user_id, prt.expires_at, prt.used_at
    INTO user_uuid, token_expires, token_used
    FROM password_reset_tokens prt
    WHERE prt.token_hash = token_hash;
    
    -- Return validation result
    IF user_uuid IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, false;
    ELSIF token_used IS NOT NULL THEN
        RETURN QUERY SELECT user_uuid, false;
    ELSIF token_expires < NOW() THEN
        RETURN QUERY SELECT user_uuid, false;
    ELSE
        RETURN QUERY SELECT user_uuid, true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to use password reset token
CREATE OR REPLACE FUNCTION use_password_reset_token(p_token TEXT)
RETURNS UUID AS $$
DECLARE
    token_hash TEXT;
    user_uuid UUID;
BEGIN
    -- Hash the provided token
    token_hash := encode(digest(p_token, 'sha256'), 'hex');
    
    -- Mark token as used
    UPDATE password_reset_tokens 
    SET used_at = NOW()
    WHERE token_hash = token_hash AND used_at IS NULL AND expires_at > NOW()
    RETURNING user_id INTO user_uuid;
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's accessible shortcodes (enhanced for multiple shortcodes)
CREATE OR REPLACE FUNCTION get_user_accessible_shortcodes_enhanced(p_user_id UUID)
RETURNS TABLE(
    shortcode_id UUID, 
    shortcode TEXT, 
    partner_name TEXT,
    access_type TEXT,
    granted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        usa.shortcode_id,
        p.short_code,
        p.name as partner_name,
        CASE 
            WHEN usa.access_type IS NOT NULL THEN usa.access_type
            ELSE 'read'
        END as access_type,
        usa.created_at as granted_at
    FROM user_shortcode_access usa
    JOIN partners p ON usa.shortcode_id = p.id
    WHERE usa.user_id = p_user_id
    AND usa.is_active = true
    AND p.is_active = true
    
    UNION
    
    -- Also include shortcodes from user's partner if they have a partner_id
    SELECT 
        p.id as shortcode_id,
        p.short_code,
        p.name as partner_name,
        'read' as access_type,
        u.created_at as granted_at
    FROM users u
    JOIN partners p ON u.partner_id = p.id
    WHERE u.id = p_user_id
    AND u.partner_id IS NOT NULL
    AND p.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_shortcode_access usa2 
        WHERE usa2.user_id = p_user_id 
        AND usa2.shortcode_id = p.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for new tables
DROP TRIGGER IF EXISTS update_password_reset_tokens_updated_at ON password_reset_tokens;
CREATE TRIGGER update_password_reset_tokens_updated_at
    BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores secure password reset tokens for users';
COMMENT ON TABLE user_sessions IS 'Manages user sessions for better security';
COMMENT ON FUNCTION generate_password_reset_token IS 'Generates a secure password reset token for a user';
COMMENT ON FUNCTION validate_password_reset_token IS 'Validates if a password reset token is valid and not expired';
COMMENT ON FUNCTION use_password_reset_token IS 'Marks a password reset token as used and returns the user ID';
COMMENT ON FUNCTION get_user_accessible_shortcodes_enhanced IS 'Enhanced function to get all shortcodes a user can access';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully enhanced user management features';
END $$;

