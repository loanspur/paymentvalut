-- Fix missing partner columns that are causing update errors
-- This migration adds the missing columns that the frontend expects

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add allowed_ips column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'allowed_ips') THEN
        ALTER TABLE partners ADD COLUMN allowed_ips TEXT[] DEFAULT '{}';
    END IF;
    
    -- Add ip_whitelist_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'ip_whitelist_enabled') THEN
        ALTER TABLE partners ADD COLUMN ip_whitelist_enabled BOOLEAN DEFAULT false;
    END IF;
    
    -- Add mpesa_initiator_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_initiator_name') THEN
        ALTER TABLE partners ADD COLUMN mpesa_initiator_name TEXT;
    END IF;
    
    -- Add mpesa_initiator_password column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_initiator_password') THEN
        ALTER TABLE partners ADD COLUMN mpesa_initiator_password TEXT;
    END IF;
    
    -- Add mpesa_consumer_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_consumer_key') THEN
        ALTER TABLE partners ADD COLUMN mpesa_consumer_key TEXT;
    END IF;
    
    -- Add mpesa_consumer_secret column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_consumer_secret') THEN
        ALTER TABLE partners ADD COLUMN mpesa_consumer_secret TEXT;
    END IF;
    
    -- Add mpesa_passkey column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_passkey') THEN
        ALTER TABLE partners ADD COLUMN mpesa_passkey TEXT;
    END IF;
    
    -- Add short_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'short_code') THEN
        ALTER TABLE partners ADD COLUMN short_code TEXT;
    END IF;
    
    -- Add api_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key') THEN
        ALTER TABLE partners ADD COLUMN api_key TEXT;
    END IF;
    
    -- Add api_key_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key_hash') THEN
        ALTER TABLE partners ADD COLUMN api_key_hash TEXT;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'is_active') THEN
        ALTER TABLE partners ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add is_mpesa_configured column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'is_mpesa_configured') THEN
        ALTER TABLE partners ADD COLUMN is_mpesa_configured BOOLEAN DEFAULT false;
    END IF;
    
    -- Add mpesa_environment column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_environment') THEN
        ALTER TABLE partners ADD COLUMN mpesa_environment VARCHAR(20) DEFAULT 'sandbox';
    END IF;
    
    -- Add mpesa_shortcode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_shortcode') THEN
        ALTER TABLE partners ADD COLUMN mpesa_shortcode VARCHAR(20);
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'created_at') THEN
        ALTER TABLE partners ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'updated_at') THEN
        ALTER TABLE partners ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
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
    updated_at = COALESCE(updated_at, NOW())
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
    OR updated_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partners_allowed_ips ON partners USING GIN(allowed_ips);
CREATE INDEX IF NOT EXISTS idx_partners_ip_whitelist_enabled ON partners(ip_whitelist_enabled);
CREATE INDEX IF NOT EXISTS idx_partners_mpesa_initiator_name ON partners(mpesa_initiator_name);
CREATE INDEX IF NOT EXISTS idx_partners_short_code ON partners(short_code);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_is_mpesa_configured ON partners(is_mpesa_configured);

-- Add comments for documentation
COMMENT ON COLUMN partners.allowed_ips IS 'Array of allowed IP addresses for API access';
COMMENT ON COLUMN partners.ip_whitelist_enabled IS 'Whether IP whitelisting is enabled for this partner';
COMMENT ON COLUMN partners.mpesa_initiator_name IS 'M-Pesa B2C InitiatorName for API calls';
COMMENT ON COLUMN partners.mpesa_initiator_password IS 'M-Pesa B2C InitiatorPassword for SecurityCredential generation';
COMMENT ON COLUMN partners.short_code IS 'Internal business identifier for the partner';

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'partners' 
ORDER BY ordinal_position;
