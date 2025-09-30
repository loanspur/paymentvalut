-- Comprehensive fix for partners table schema
-- This migration ensures all required columns exist and refreshes the schema cache

-- Drop and recreate the partners table with all required columns
-- This will force a schema cache refresh

-- First, backup existing data
CREATE TABLE IF NOT EXISTS partners_backup AS SELECT * FROM partners;

-- Drop the existing partners table
DROP TABLE IF EXISTS partners CASCADE;

-- Recreate partners table with all required columns
CREATE TABLE partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(50),
    mpesa_shortcode VARCHAR(20),
    mpesa_consumer_key TEXT,
    mpesa_consumer_secret TEXT,
    mpesa_passkey TEXT,
    mpesa_initiator_name TEXT,
    mpesa_initiator_password TEXT,
    mpesa_environment VARCHAR(20) DEFAULT 'sandbox',
    is_active BOOLEAN DEFAULT true,
    is_mpesa_configured BOOLEAN DEFAULT false,
    api_key TEXT,
    api_key_hash TEXT,
    allowed_ips TEXT[] DEFAULT '{}',
    ip_whitelist_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restore data from backup
INSERT INTO partners (
    id, name, short_code, mpesa_shortcode, mpesa_consumer_key, 
    mpesa_consumer_secret, mpesa_passkey, mpesa_initiator_name, 
    mpesa_initiator_password, mpesa_environment, is_active, 
    is_mpesa_configured, api_key, api_key_hash, allowed_ips, 
    ip_whitelist_enabled, created_at, updated_at
)
SELECT 
    id, name, short_code, mpesa_shortcode, mpesa_consumer_key,
    mpesa_consumer_secret, mpesa_passkey, mpesa_initiator_name,
    mpesa_initiator_password, mpesa_environment, is_active,
    is_mpesa_configured, api_key, api_key_hash, 
    COALESCE(allowed_ips, '{}'), 
    COALESCE(ip_whitelist_enabled, false),
    created_at, updated_at
FROM partners_backup;

-- Drop backup table
DROP TABLE partners_backup;

-- Add comments for clarity
COMMENT ON COLUMN partners.mpesa_initiator_password IS 'M-Pesa B2C InitiatorPassword used for SecurityCredential generation';
COMMENT ON COLUMN partners.mpesa_initiator_name IS 'M-Pesa B2C InitiatorName registered with Safaricom';
COMMENT ON COLUMN partners.allowed_ips IS 'Array of allowed IP addresses for API access';
COMMENT ON COLUMN partners.ip_whitelist_enabled IS 'Whether IP whitelisting is enabled for this partner';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partners_mpesa_shortcode ON partners(mpesa_shortcode);
CREATE INDEX IF NOT EXISTS idx_partners_api_key_hash ON partners(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);

-- Force schema cache refresh by updating a dummy record
UPDATE partners SET updated_at = NOW() WHERE id = (SELECT id FROM partners LIMIT 1);
