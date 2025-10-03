-- Fix missing partner columns directly
-- This script adds the missing columns that are causing the update error

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add allowed_ips column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'allowed_ips') THEN
        ALTER TABLE partners ADD COLUMN allowed_ips TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added allowed_ips column';
    ELSE
        RAISE NOTICE 'allowed_ips column already exists';
    END IF;
    
    -- Add ip_whitelist_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'ip_whitelist_enabled') THEN
        ALTER TABLE partners ADD COLUMN ip_whitelist_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added ip_whitelist_enabled column';
    ELSE
        RAISE NOTICE 'ip_whitelist_enabled column already exists';
    END IF;
    
    -- Add mpesa_initiator_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_initiator_name') THEN
        ALTER TABLE partners ADD COLUMN mpesa_initiator_name TEXT;
        RAISE NOTICE 'Added mpesa_initiator_name column';
    ELSE
        RAISE NOTICE 'mpesa_initiator_name column already exists';
    END IF;
    
    -- Add mpesa_initiator_password column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_initiator_password') THEN
        ALTER TABLE partners ADD COLUMN mpesa_initiator_password TEXT;
        RAISE NOTICE 'Added mpesa_initiator_password column';
    ELSE
        RAISE NOTICE 'mpesa_initiator_password column already exists';
    END IF;
    
    -- Add mpesa_consumer_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_consumer_key') THEN
        ALTER TABLE partners ADD COLUMN mpesa_consumer_key TEXT;
        RAISE NOTICE 'Added mpesa_consumer_key column';
    ELSE
        RAISE NOTICE 'mpesa_consumer_key column already exists';
    END IF;
    
    -- Add mpesa_consumer_secret column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_consumer_secret') THEN
        ALTER TABLE partners ADD COLUMN mpesa_consumer_secret TEXT;
        RAISE NOTICE 'Added mpesa_consumer_secret column';
    ELSE
        RAISE NOTICE 'mpesa_consumer_secret column already exists';
    END IF;
    
    -- Add mpesa_passkey column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_passkey') THEN
        ALTER TABLE partners ADD COLUMN mpesa_passkey TEXT;
        RAISE NOTICE 'Added mpesa_passkey column';
    ELSE
        RAISE NOTICE 'mpesa_passkey column already exists';
    END IF;
    
    -- Add short_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'short_code') THEN
        ALTER TABLE partners ADD COLUMN short_code TEXT;
        RAISE NOTICE 'Added short_code column';
    ELSE
        RAISE NOTICE 'short_code column already exists';
    END IF;
    
    -- Add api_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key') THEN
        ALTER TABLE partners ADD COLUMN api_key TEXT;
        RAISE NOTICE 'Added api_key column';
    ELSE
        RAISE NOTICE 'api_key column already exists';
    END IF;
    
    -- Add api_key_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key_hash') THEN
        ALTER TABLE partners ADD COLUMN api_key_hash TEXT;
        RAISE NOTICE 'Added api_key_hash column';
    ELSE
        RAISE NOTICE 'api_key_hash column already exists';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'is_active') THEN
        ALTER TABLE partners ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column';
    ELSE
        RAISE NOTICE 'is_active column already exists';
    END IF;
    
    -- Add is_mpesa_configured column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'is_mpesa_configured') THEN
        ALTER TABLE partners ADD COLUMN is_mpesa_configured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_mpesa_configured column';
    ELSE
        RAISE NOTICE 'is_mpesa_configured column already exists';
    END IF;
    
    -- Add mpesa_environment column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_environment') THEN
        ALTER TABLE partners ADD COLUMN mpesa_environment VARCHAR(20) DEFAULT 'sandbox';
        RAISE NOTICE 'Added mpesa_environment column';
    ELSE
        RAISE NOTICE 'mpesa_environment column already exists';
    END IF;
    
    -- Add mpesa_shortcode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_shortcode') THEN
        ALTER TABLE partners ADD COLUMN mpesa_shortcode VARCHAR(20);
        RAISE NOTICE 'Added mpesa_shortcode column';
    ELSE
        RAISE NOTICE 'mpesa_shortcode column already exists';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'created_at') THEN
        ALTER TABLE partners ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'updated_at') THEN
        ALTER TABLE partners ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
    
    -- Add encrypted_credentials column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'encrypted_credentials') THEN
        ALTER TABLE partners ADD COLUMN encrypted_credentials TEXT;
        RAISE NOTICE 'Added encrypted_credentials column';
    ELSE
        RAISE NOTICE 'encrypted_credentials column already exists';
    END IF;
    
    -- Add security_credential column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'security_credential') THEN
        ALTER TABLE partners ADD COLUMN security_credential TEXT;
        RAISE NOTICE 'Added security_credential column';
    ELSE
        RAISE NOTICE 'security_credential column already exists';
    END IF;
END $$;

-- Update existing records with default values for new columns
UPDATE partners 
SET 
    allowed_ips = COALESCE(allowed_ips, '{}'),
    ip_whitelist_enabled = COALESCE(ip_whitelist_enabled, false),
    mpesa_initiator_name = COALESCE(mpesa_initiator_name, ''),
    mpesa_initiator_password = COALESCE(mpesa_initiator_password, ''),
    mpesa_consumer_key = COALESCE(mpesa_consumer_key, ''),
    mpesa_consumer_secret = COALESCE(mpesa_consumer_secret, ''),
    mpesa_passkey = COALESCE(mpesa_passkey, ''),
    short_code = COALESCE(short_code, ''),
    api_key = COALESCE(api_key, ''),
    api_key_hash = COALESCE(api_key_hash, ''),
    is_active = COALESCE(is_active, true),
    is_mpesa_configured = COALESCE(is_mpesa_configured, false),
    mpesa_environment = COALESCE(mpesa_environment, 'sandbox'),
    mpesa_shortcode = COALESCE(mpesa_shortcode, ''),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW()),
    encrypted_credentials = COALESCE(encrypted_credentials, ''),
    security_credential = COALESCE(security_credential, '')
WHERE 
    allowed_ips IS NULL 
    OR ip_whitelist_enabled IS NULL 
    OR mpesa_initiator_name IS NULL 
    OR mpesa_initiator_password IS NULL 
    OR mpesa_consumer_key IS NULL 
    OR mpesa_consumer_secret IS NULL 
    OR mpesa_passkey IS NULL 
    OR short_code IS NULL 
    OR api_key IS NULL 
    OR api_key_hash IS NULL 
    OR is_active IS NULL 
    OR is_mpesa_configured IS NULL 
    OR mpesa_environment IS NULL 
    OR mpesa_shortcode IS NULL 
    OR created_at IS NULL 
    OR updated_at IS NULL
    OR encrypted_credentials IS NULL 
    OR security_credential IS NULL;

-- Show the current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'partners' 
ORDER BY ordinal_position;
