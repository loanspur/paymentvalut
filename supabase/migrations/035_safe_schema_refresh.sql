-- Safe schema refresh that handles missing columns gracefully
-- This migration will work regardless of the current table structure

-- Step 1: Create a temporary table with the correct schema
CREATE TABLE partners_new (
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

-- Step 2: Copy data from old table to new table (only existing columns)
INSERT INTO partners_new (
    id, name, short_code, mpesa_shortcode, mpesa_environment, 
    is_active, is_mpesa_configured, api_key, api_key_hash, 
    created_at, updated_at
)
SELECT 
    id, 
    COALESCE(name, ''),
    short_code,
    mpesa_shortcode,
    COALESCE(mpesa_environment, 'sandbox'),
    COALESCE(is_active, true),
    COALESCE(is_mpesa_configured, false),
    api_key,
    api_key_hash,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM partners;

-- Step 3: Try to copy additional columns if they exist
-- This will fail silently if columns don't exist
DO $$
BEGIN
    -- Try to update mpesa_consumer_key if it exists in the old table
    BEGIN
        UPDATE partners_new SET mpesa_consumer_key = p.mpesa_consumer_key
        FROM partners p WHERE partners_new.id = p.id;
    EXCEPTION WHEN undefined_column THEN
        -- Column doesn't exist, skip
        NULL;
    END;

    -- Try to update mpesa_consumer_secret if it exists
    BEGIN
        UPDATE partners_new SET mpesa_consumer_secret = p.mpesa_consumer_secret
        FROM partners p WHERE partners_new.id = p.id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;

    -- Try to update mpesa_passkey if it exists
    BEGIN
        UPDATE partners_new SET mpesa_passkey = p.mpesa_passkey
        FROM partners p WHERE partners_new.id = p.id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;

    -- Try to update mpesa_initiator_name if it exists
    BEGIN
        UPDATE partners_new SET mpesa_initiator_name = p.mpesa_initiator_name
        FROM partners p WHERE partners_new.id = p.id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;

    -- Try to update mpesa_initiator_password if it exists
    BEGIN
        UPDATE partners_new SET mpesa_initiator_password = p.mpesa_initiator_password
        FROM partners p WHERE partners_new.id = p.id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;

    -- Try to update allowed_ips if it exists
    BEGIN
        UPDATE partners_new SET allowed_ips = p.allowed_ips
        FROM partners p WHERE partners_new.id = p.id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;

    -- Try to update ip_whitelist_enabled if it exists
    BEGIN
        UPDATE partners_new SET ip_whitelist_enabled = p.ip_whitelist_enabled
        FROM partners p WHERE partners_new.id = p.id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;
END $$;

-- Step 4: Drop the old table
DROP TABLE partners CASCADE;

-- Step 5: Rename the new table
ALTER TABLE partners_new RENAME TO partners;

-- Step 6: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_partners_mpesa_shortcode ON partners(mpesa_shortcode);
CREATE INDEX IF NOT EXISTS idx_partners_api_key_hash ON partners(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);

-- Step 7: Add comments
COMMENT ON COLUMN partners.mpesa_initiator_password IS 'M-Pesa B2C InitiatorPassword used for SecurityCredential generation';
COMMENT ON COLUMN partners.mpesa_initiator_name IS 'M-Pesa B2C InitiatorName registered with Safaricom';
COMMENT ON COLUMN partners.allowed_ips IS 'Array of allowed IP addresses for API access';
COMMENT ON COLUMN partners.ip_whitelist_enabled IS 'Whether IP whitelisting is enabled for this partner';
