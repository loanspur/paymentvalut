-- Comprehensive Database Fix for Disbursement Issues
-- This script fixes all the missing columns and tables causing disbursement errors

-- ==============================================
-- 1. FIX MISSING PARTNER COLUMNS
-- ==============================================

-- Add missing columns to partners table if they don't exist
DO $$ 
BEGIN
    -- Add allowed_ips column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'allowed_ips') THEN
        ALTER TABLE partners ADD COLUMN allowed_ips TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added allowed_ips column';
    END IF;
    
    -- Add ip_whitelist_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'ip_whitelist_enabled') THEN
        ALTER TABLE partners ADD COLUMN ip_whitelist_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added ip_whitelist_enabled column';
    END IF;
    
    -- Add mpesa_initiator_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_initiator_name') THEN
        ALTER TABLE partners ADD COLUMN mpesa_initiator_name TEXT;
        RAISE NOTICE 'Added mpesa_initiator_name column';
    END IF;
    
    -- Add mpesa_initiator_password column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_initiator_password') THEN
        ALTER TABLE partners ADD COLUMN mpesa_initiator_password TEXT;
        RAISE NOTICE 'Added mpesa_initiator_password column';
    END IF;
    
    -- Add mpesa_consumer_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_consumer_key') THEN
        ALTER TABLE partners ADD COLUMN mpesa_consumer_key TEXT;
        RAISE NOTICE 'Added mpesa_consumer_key column';
    END IF;
    
    -- Add mpesa_consumer_secret column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_consumer_secret') THEN
        ALTER TABLE partners ADD COLUMN mpesa_consumer_secret TEXT;
        RAISE NOTICE 'Added mpesa_consumer_secret column';
    END IF;
    
    -- Add mpesa_passkey column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_passkey') THEN
        ALTER TABLE partners ADD COLUMN mpesa_passkey TEXT;
        RAISE NOTICE 'Added mpesa_passkey column';
    END IF;
    
    -- Add short_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'short_code') THEN
        ALTER TABLE partners ADD COLUMN short_code TEXT;
        RAISE NOTICE 'Added short_code column';
    END IF;
    
    -- Add api_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key') THEN
        ALTER TABLE partners ADD COLUMN api_key TEXT;
        RAISE NOTICE 'Added api_key column';
    END IF;
    
    -- Add api_key_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key_hash') THEN
        ALTER TABLE partners ADD COLUMN api_key_hash TEXT;
        RAISE NOTICE 'Added api_key_hash column';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'is_active') THEN
        ALTER TABLE partners ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column';
    END IF;
    
    -- Add is_mpesa_configured column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'is_mpesa_configured') THEN
        ALTER TABLE partners ADD COLUMN is_mpesa_configured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_mpesa_configured column';
    END IF;
    
    -- Add mpesa_environment column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_environment') THEN
        ALTER TABLE partners ADD COLUMN mpesa_environment VARCHAR(20) DEFAULT 'sandbox';
        RAISE NOTICE 'Added mpesa_environment column';
    END IF;
    
    -- Add mpesa_shortcode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'mpesa_shortcode') THEN
        ALTER TABLE partners ADD COLUMN mpesa_shortcode VARCHAR(20);
        RAISE NOTICE 'Added mpesa_shortcode column';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'created_at') THEN
        ALTER TABLE partners ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'updated_at') THEN
        ALTER TABLE partners ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    -- Add encrypted_credentials column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'encrypted_credentials') THEN
        ALTER TABLE partners ADD COLUMN encrypted_credentials TEXT;
        RAISE NOTICE 'Added encrypted_credentials column';
    END IF;
    
    -- Add security_credential column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'security_credential') THEN
        ALTER TABLE partners ADD COLUMN security_credential TEXT;
        RAISE NOTICE 'Added security_credential column';
    END IF;
END $$;

-- ==============================================
-- 2. FIX MISSING DUPLICATE PREVENTION TABLES
-- ==============================================

-- Create disbursement_restrictions table if it doesn't exist
CREATE TABLE IF NOT EXISTS disbursement_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    -- Restriction types
    restriction_type VARCHAR(50) NOT NULL CHECK (restriction_type IN (
        'same_customer_amount_time',  -- Same customer + amount within time window
        'same_ip_time',              -- Same IP within time window  
        'same_customer_daily_limit', -- Daily limit per customer
        'same_ip_daily_limit',       -- Daily limit per IP
        'insufficient_funds_queue'   -- Queue when insufficient funds
    )),
    
    -- Configuration
    time_window_minutes INTEGER DEFAULT 5,  -- Time window for restrictions
    daily_limit_amount DECIMAL(15,2),       -- Daily limit amount
    daily_limit_count INTEGER,              -- Daily limit count
    is_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disbursement_blocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS disbursement_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    -- Blocking criteria
    block_type VARCHAR(50) NOT NULL CHECK (block_type IN (
        'duplicate_customer_amount',
        'duplicate_ip',
        'daily_limit_exceeded',
        'insufficient_funds'
    )),
    
    -- Identifiers
    customer_id TEXT,
    msisdn TEXT,
    amount DECIMAL(15,2),
    client_ip TEXT,
    
    -- Block details
    block_reason TEXT NOT NULL,
    block_expires_at TIMESTAMP WITH TIME ZONE,
    original_request_id UUID REFERENCES disbursement_requests(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create insufficient_funds_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS insufficient_funds_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    -- Request details
    disbursement_request_id UUID NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    msisdn TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    client_ip TEXT,
    
    -- Queue management
    priority INTEGER DEFAULT 1,  -- 1=high, 2=medium, 3=low
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'expired')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ==============================================

-- Partner table indexes
CREATE INDEX IF NOT EXISTS idx_partners_allowed_ips ON partners USING GIN(allowed_ips);
CREATE INDEX IF NOT EXISTS idx_partners_ip_whitelist_enabled ON partners(ip_whitelist_enabled);
CREATE INDEX IF NOT EXISTS idx_partners_mpesa_initiator_name ON partners(mpesa_initiator_name);
CREATE INDEX IF NOT EXISTS idx_partners_short_code ON partners(short_code);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_is_mpesa_configured ON partners(is_mpesa_configured);
CREATE INDEX IF NOT EXISTS idx_partners_encrypted_credentials ON partners(encrypted_credentials) WHERE encrypted_credentials IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_security_credential ON partners(security_credential) WHERE security_credential IS NOT NULL;

-- Duplicate prevention indexes
CREATE INDEX IF NOT EXISTS idx_disbursement_restrictions_partner_type ON disbursement_restrictions(partner_id, restriction_type);
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_partner_type ON disbursement_blocks(partner_id, block_type);
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_expires ON disbursement_blocks(block_expires_at) WHERE block_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_customer ON disbursement_blocks(customer_id, partner_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_ip ON disbursement_blocks(client_ip, partner_id) WHERE client_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insufficient_funds_queue_partner ON insufficient_funds_queue(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_insufficient_funds_queue_retry ON insufficient_funds_queue(next_retry_at, status) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insufficient_funds_queue_priority ON insufficient_funds_queue(priority, created_at);

-- Composite indexes for duplicate detection
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_customer_amount_time ON disbursement_requests(partner_id, customer_id, amount, created_at);
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_ip_time ON disbursement_requests(partner_id, created_at) WHERE origin = 'ussd';

-- ==============================================
-- 4. INSERT DEFAULT RESTRICTIONS
-- ==============================================

-- Insert default restrictions for all partners (only if they don't exist)
INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, is_enabled)
SELECT 
    id as partner_id,
    'same_customer_amount_time' as restriction_type,
    5 as time_window_minutes,
    true as is_enabled
FROM partners 
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM disbursement_restrictions dr 
    WHERE dr.partner_id = partners.id 
    AND dr.restriction_type = 'same_customer_amount_time'
  );

INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, is_enabled)
SELECT 
    id as partner_id,
    'same_ip_time' as restriction_type,
    2 as time_window_minutes,
    true as is_enabled
FROM partners 
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM disbursement_restrictions dr 
    WHERE dr.partner_id = partners.id 
    AND dr.restriction_type = 'same_ip_time'
  );

INSERT INTO disbursement_restrictions (partner_id, restriction_type, daily_limit_amount, daily_limit_count, is_enabled)
SELECT 
    id as partner_id,
    'same_customer_daily_limit' as restriction_type,
    50000.00 as daily_limit_amount,
    10 as daily_limit_count,
    true as is_enabled
FROM partners 
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM disbursement_restrictions dr 
    WHERE dr.partner_id = partners.id 
    AND dr.restriction_type = 'same_customer_daily_limit'
  );

INSERT INTO disbursement_restrictions (partner_id, restriction_type, daily_limit_amount, daily_limit_count, is_enabled)
SELECT 
    id as partner_id,
    'same_ip_daily_limit' as restriction_type,
    100000.00 as daily_limit_amount,
    20 as daily_limit_count,
    true as is_enabled
FROM partners 
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM disbursement_restrictions dr 
    WHERE dr.partner_id = partners.id 
    AND dr.restriction_type = 'same_ip_daily_limit'
  );

INSERT INTO disbursement_restrictions (partner_id, restriction_type, is_enabled)
SELECT 
    id as partner_id,
    'insufficient_funds_queue' as restriction_type,
    true as is_enabled
FROM partners 
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM disbursement_restrictions dr 
    WHERE dr.partner_id = partners.id 
    AND dr.restriction_type = 'insufficient_funds_queue'
  );

-- ==============================================
-- 5. UPDATE EXISTING RECORDS WITH DEFAULT VALUES
-- ==============================================

-- Update existing partners with default values for new columns
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

-- ==============================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON COLUMN partners.allowed_ips IS 'Array of allowed IP addresses for API access';
COMMENT ON COLUMN partners.ip_whitelist_enabled IS 'Whether IP whitelisting is enabled for this partner';
COMMENT ON COLUMN partners.mpesa_initiator_name IS 'M-Pesa B2C InitiatorName for API calls';
COMMENT ON COLUMN partners.mpesa_initiator_password IS 'M-Pesa B2C InitiatorPassword for SecurityCredential generation';
COMMENT ON COLUMN partners.short_code IS 'Internal business identifier for the partner';
COMMENT ON COLUMN partners.encrypted_credentials IS 'Encrypted M-Pesa credentials stored in vault format for Edge Functions';
COMMENT ON COLUMN partners.security_credential IS 'RSA-encrypted SecurityCredential for M-Pesa B2C transactions';

COMMENT ON TABLE disbursement_restrictions IS 'Configuration for duplicate prevention and rate limiting';
COMMENT ON TABLE disbursement_blocks IS 'Tracks blocked disbursement requests with expiration times';
COMMENT ON TABLE insufficient_funds_queue IS 'Queues disbursements when insufficient funds, with intelligent retry logic';

-- ==============================================
-- 7. VERIFY THE FIXES
-- ==============================================

-- Show the current partners table schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'partners' 
ORDER BY ordinal_position;

-- Show the duplicate prevention tables
SELECT 
    table_name, 
    table_type
FROM information_schema.tables 
WHERE table_name IN ('disbursement_restrictions', 'disbursement_blocks', 'insufficient_funds_queue')
ORDER BY table_name;

-- Show default restrictions created
SELECT 
    p.name as partner_name,
    dr.restriction_type,
    dr.time_window_minutes,
    dr.daily_limit_amount,
    dr.daily_limit_count,
    dr.is_enabled
FROM disbursement_restrictions dr
JOIN partners p ON dr.partner_id = p.id
ORDER BY p.name, dr.restriction_type;
