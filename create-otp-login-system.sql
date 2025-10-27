-- OTP Login System Database Schema
-- This script creates the necessary tables for OTP-based login validation

-- 1. Add phone and email verification fields to users table
DO $$
BEGIN
    -- Add phone verification fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
        RAISE NOTICE 'Column phone_number added to users table.';
    ELSE
        RAISE NOTICE 'Column phone_number already exists in users table.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_verified') THEN
        ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Column phone_verified added to users table.';
    ELSE
        RAISE NOTICE 'Column phone_verified already exists in users table.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Column email_verified added to users table.';
    ELSE
        RAISE NOTICE 'Column email_verified already exists in users table.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_verified_at') THEN
        ALTER TABLE users ADD COLUMN phone_verified_at TIMESTAMP;
        RAISE NOTICE 'Column phone_verified_at added to users table.';
    ELSE
        RAISE NOTICE 'Column phone_verified_at already exists in users table.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified_at') THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
        RAISE NOTICE 'Column email_verified_at added to users table.';
    ELSE
        RAISE NOTICE 'Column email_verified_at already exists in users table.';
    END IF;
END
$$;

-- 2. Create OTP validations table for login OTPs
CREATE TABLE IF NOT EXISTS login_otp_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'login', -- 'login', 'phone_verification', 'email_verification'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'validated', 'expired', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    sms_sent BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create email verification table
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'expired'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    email_sent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create phone verification table
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'expired'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    sms_sent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_otp_user_id ON login_otp_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_login_otp_email ON login_otp_validations(email);
CREATE INDEX IF NOT EXISTS idx_login_otp_phone ON login_otp_validations(phone_number);
CREATE INDEX IF NOT EXISTS idx_login_otp_status ON login_otp_validations(status);
CREATE INDEX IF NOT EXISTS idx_login_otp_expires_at ON login_otp_validations(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_status ON email_verifications(status);

CREATE INDEX IF NOT EXISTS idx_phone_verification_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verification_status ON phone_verifications(status);

-- 6. Create function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    -- Clean up expired login OTPs
    DELETE FROM login_otp_validations 
    WHERE expires_at < NOW() AND status = 'pending';
    
    -- Clean up expired email verifications
    DELETE FROM email_verifications 
    WHERE expires_at < NOW() AND status = 'pending';
    
    -- Clean up expired phone verifications
    DELETE FROM phone_verifications 
    WHERE expires_at < NOW() AND status = 'pending';
    
    RAISE NOTICE 'Expired OTPs and verifications cleaned up.';
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to generate OTP code
CREATE OR REPLACE FUNCTION generate_otp_code()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 8. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to login_otp_validations
DROP TRIGGER IF EXISTS update_login_otp_validations_updated_at ON login_otp_validations;
CREATE TRIGGER update_login_otp_validations_updated_at
    BEFORE UPDATE ON login_otp_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Create RPC function to validate OTP
CREATE OR REPLACE FUNCTION validate_login_otp(
    p_user_id UUID,
    p_otp_code VARCHAR(6)
)
RETURNS JSON AS $$
DECLARE
    otp_record RECORD;
    result JSON;
BEGIN
    -- Find the most recent pending OTP for the user
    SELECT * INTO otp_record
    FROM login_otp_validations
    WHERE user_id = p_user_id
    AND status = 'pending'
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if OTP exists
    IF otp_record IS NULL THEN
        result := json_build_object(
            'success', false,
            'error', 'No valid OTP found or OTP has expired'
        );
        RETURN result;
    END IF;
    
    -- Check if max attempts exceeded
    IF otp_record.attempts >= otp_record.max_attempts THEN
        UPDATE login_otp_validations 
        SET status = 'failed', updated_at = NOW()
        WHERE id = otp_record.id;
        
        result := json_build_object(
            'success', false,
            'error', 'Maximum attempts exceeded'
        );
        RETURN result;
    END IF;
    
    -- Check if OTP code matches
    IF otp_record.otp_code = p_otp_code THEN
        -- Mark OTP as validated
        UPDATE login_otp_validations 
        SET status = 'validated', validated_at = NOW(), updated_at = NOW()
        WHERE id = otp_record.id;
        
        result := json_build_object(
            'success', true,
            'message', 'OTP validated successfully'
        );
        RETURN result;
    ELSE
        -- Increment attempts
        UPDATE login_otp_validations 
        SET attempts = attempts + 1, updated_at = NOW()
        WHERE id = otp_record.id;
        
        result := json_build_object(
            'success', false,
            'error', 'Invalid OTP code',
            'attempts_remaining', otp_record.max_attempts - otp_record.attempts - 1
        );
        RETURN result;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Create RPC function to send OTP
CREATE OR REPLACE FUNCTION send_login_otp(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_phone_number VARCHAR(20)
)
RETURNS JSON AS $$
DECLARE
    otp_code VARCHAR(6);
    otp_id UUID;
    result JSON;
BEGIN
    -- Generate OTP code
    otp_code := generate_otp_code();
    
    -- Create OTP record
    INSERT INTO login_otp_validations (
        user_id, email, phone_number, otp_code, expires_at
    ) VALUES (
        p_user_id, p_email, p_phone_number, otp_code, NOW() + INTERVAL '10 minutes'
    ) RETURNING id INTO otp_id;
    
    result := json_build_object(
        'success', true,
        'otp_id', otp_id,
        'otp_code', otp_code, -- Only for development/testing
        'expires_at', NOW() + INTERVAL '10 minutes',
        'message', 'OTP generated successfully'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 11. Update existing users to have email_verified = true (since they can already login)
UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE email_verified IS NULL;

-- 12. Create system settings for OTP configuration
-- Let's create a simple approach that works with the existing table structure
DO $$
DECLARE
    table_exists BOOLEAN;
    has_id_column BOOLEAN;
    has_name_column BOOLEAN;
    has_value_column BOOLEAN;
    has_description_column BOOLEAN;
BEGIN
    -- Check if system_settings table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'system_settings'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'system_settings table exists. Checking column structure...';
        
        -- Check what columns exist
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'system_settings' AND column_name = 'id'
        ) INTO has_id_column;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'system_settings' AND column_name = 'name'
        ) INTO has_name_column;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'system_settings' AND column_name = 'value'
        ) INTO has_value_column;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'system_settings' AND column_name = 'description'
        ) INTO has_description_column;
        
        RAISE NOTICE 'Columns found - id: %, name: %, value: %, description: %', 
            has_id_column, has_name_column, has_value_column, has_description_column;
            
        -- Insert OTP settings based on available columns
        IF has_name_column AND has_value_column THEN
            -- Use name/value structure
            INSERT INTO system_settings (name, value, description) VALUES
            ('otp_expiry_minutes', '10', 'OTP expiry time in minutes'),
            ('otp_max_attempts', '3', 'Maximum OTP validation attempts'),
            ('otp_length', '6', 'OTP code length'),
            ('login_otp_enabled', 'true', 'Enable OTP for login validation'),
            ('smtp_host', '', 'SMTP server host'),
            ('smtp_port', '587', 'SMTP server port'),
            ('smtp_username', '', 'SMTP username'),
            ('smtp_password', '', 'SMTP password (encrypted)'),
            ('smtp_from_email', '', 'From email address'),
            ('smtp_from_name', 'Payment Vault', 'From name for emails')
            ON CONFLICT (name) DO NOTHING;
            
            RAISE NOTICE 'Settings inserted using name/value structure.';
        ELSE
            RAISE NOTICE 'Cannot determine table structure. Please check system_settings table manually.';
        END IF;
    ELSE
        RAISE NOTICE 'system_settings table does not exist. Creating with standard structure...';
        
        -- Create system_settings table with standard structure
        CREATE TABLE system_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Insert settings
        INSERT INTO system_settings (name, value, description) VALUES
        ('otp_expiry_minutes', '10', 'OTP expiry time in minutes'),
        ('otp_max_attempts', '3', 'Maximum OTP validation attempts'),
        ('otp_length', '6', 'OTP code length'),
        ('login_otp_enabled', 'true', 'Enable OTP for login validation'),
        ('smtp_host', '', 'SMTP server host'),
        ('smtp_port', '587', 'SMTP server port'),
        ('smtp_username', '', 'SMTP username'),
        ('smtp_password', '', 'SMTP password (encrypted)'),
        ('smtp_from_email', '', 'From email address'),
        ('smtp_from_name', 'Payment Vault', 'From name for emails');
        
        RAISE NOTICE 'system_settings table created and populated.';
    END IF;
END
$$;

-- 14. Final success message
DO $$
BEGIN
    RAISE NOTICE 'OTP Login System database schema created successfully!';
END
$$;
