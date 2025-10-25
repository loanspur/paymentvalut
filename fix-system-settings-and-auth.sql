-- Fix System Settings and Auth Issues
-- This script ensures all required tables exist and are properly configured

-- Step 1: Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique key for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'Value of the setting (encrypted if is_encrypted is true)';
COMMENT ON COLUMN system_settings.setting_type IS 'Data type of the setting value';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of what this setting does';
COMMENT ON COLUMN system_settings.is_encrypted IS 'Whether the setting value is encrypted';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_settings_updated_at') THEN
        CREATE TRIGGER update_system_settings_updated_at 
        BEFORE UPDATE ON system_settings 
        FOR EACH ROW EXECUTE FUNCTION update_system_settings_updated_at();
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Step 2: Insert default NCBA system settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_encrypted) VALUES
('ncba_business_short_code', '880100', 'string', 'NCBA Paybill business short code (global)', FALSE),
('ncba_notification_username', '', 'string', 'Username for NCBA Paybill Push Notification authentication', TRUE),
('ncba_notification_password', '', 'string', 'Password for NCBA Paybill Push Notification authentication', TRUE),
('ncba_notification_secret_key', '', 'string', 'Secret key for generating and validating notification hashes', TRUE),
('ncba_notification_endpoint_url', '', 'string', 'Endpoint URL where NCBA will send payment notifications', FALSE),
('ncba_account_number', '123456', 'string', 'NCBA account number for paybill payments', FALSE),
('ncba_account_reference_separator', '#', 'string', 'Separator between account number and partner ID', FALSE)
ON CONFLICT (setting_key) DO NOTHING;

-- Step 3: Ensure users table exists and has required columns
DO $$
BEGIN
    -- Check if users table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            phone_number VARCHAR(20),
            department VARCHAR(100),
            notes TEXT,
            role VARCHAR(50) DEFAULT 'user',
            partner_id UUID,
            profile_picture_url TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            email_verified BOOLEAN DEFAULT FALSE,
            last_login_at TIMESTAMP,
            last_activity_at TIMESTAMP,
            last_password_change TIMESTAMP,
            password_change_required BOOLEAN DEFAULT FALSE,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created users table';
    ELSE
        RAISE NOTICE 'users table already exists';
    END IF;
END $$;

-- Step 4: Add missing columns to users table if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Add missing columns one by one
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
            ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
            RAISE NOTICE 'Added first_name column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
            ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
            RAISE NOTICE 'Added last_name column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN
            ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
            RAISE NOTICE 'Added phone_number column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
            ALTER TABLE users ADD COLUMN department VARCHAR(100);
            RAISE NOTICE 'Added department column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notes') THEN
            ALTER TABLE users ADD COLUMN notes TEXT;
            RAISE NOTICE 'Added notes column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
            ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
            RAISE NOTICE 'Added role column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'partner_id') THEN
            ALTER TABLE users ADD COLUMN partner_id UUID;
            RAISE NOTICE 'Added partner_id column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture_url') THEN
            ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
            RAISE NOTICE 'Added profile_picture_url column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
            ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
            RAISE NOTICE 'Added is_active column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
            ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added email_verified column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
            ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
            RAISE NOTICE 'Added last_login_at column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_activity_at') THEN
            ALTER TABLE users ADD COLUMN last_activity_at TIMESTAMP;
            RAISE NOTICE 'Added last_activity_at column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_password_change') THEN
            ALTER TABLE users ADD COLUMN last_password_change TIMESTAMP;
            RAISE NOTICE 'Added last_password_change column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_change_required') THEN
            ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added password_change_required column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
            ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added two_factor_enabled column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
            ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to users';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
            ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column to users';
        END IF;
    END IF;
END $$;

-- Step 5: Create trigger for users updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();
    END IF;
END $$;

-- Step 6: Ensure partners table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partners') THEN
        CREATE TABLE partners (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            short_code VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(20),
            address TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created partners table';
    ELSE
        RAISE NOTICE 'partners table already exists';
    END IF;
END $$;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_short_code ON partners(short_code);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);

-- Step 8: Insert a default admin user if no users exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        INSERT INTO users (
            email, 
            password_hash, 
            first_name, 
            last_name, 
            role, 
            is_active, 
            email_verified
        ) VALUES (
            'admin@mpesavault.com',
            '$2a$10$dummy.hash.for.testing.purposes.only',
            'System',
            'Administrator',
            'admin',
            TRUE,
            TRUE
        );
        RAISE NOTICE 'Created default admin user: admin@mpesavault.com';
    ELSE
        RAISE NOTICE 'Users already exist, skipping default user creation';
    END IF;
END $$;

-- Step 9: Insert a default partner if no partners exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM partners LIMIT 1) THEN
        INSERT INTO partners (
            name,
            short_code,
            email,
            is_active
        ) VALUES (
            'Default Partner',
            'DEFAULT',
            'admin@mpesavault.com',
            TRUE
        );
        RAISE NOTICE 'Created default partner: Default Partner';
    ELSE
        RAISE NOTICE 'Partners already exist, skipping default partner creation';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'System settings and auth tables setup completed successfully!';
    RAISE NOTICE 'All required tables and columns have been created/updated.';
    RAISE NOTICE 'Default admin user and partner have been created if they did not exist.';
END $$;
