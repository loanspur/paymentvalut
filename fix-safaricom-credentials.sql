-- Fix Safaricom Credentials Issues
-- This script will address the most common credential problems

-- ==============================================
-- 1. ADD MISSING CREDENTIAL COLUMNS TO PARTNERS TABLE
-- ==============================================

-- Add credential columns if they don't exist
DO $$ 
BEGIN
    -- Add consumer_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'consumer_key') THEN
        ALTER TABLE partners ADD COLUMN consumer_key TEXT;
    END IF;
    
    -- Add consumer_secret column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'consumer_secret') THEN
        ALTER TABLE partners ADD COLUMN consumer_secret TEXT;
    END IF;
    
    -- Add initiator_password column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'initiator_password') THEN
        ALTER TABLE partners ADD COLUMN initiator_password TEXT;
    END IF;
    
    -- Add security_credential column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'security_credential') THEN
        ALTER TABLE partners ADD COLUMN security_credential TEXT;
    END IF;
    
    -- Add initiator_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'initiator_name') THEN
        ALTER TABLE partners ADD COLUMN initiator_name TEXT;
    END IF;
    
    -- Add encrypted_credentials column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'encrypted_credentials') THEN
        ALTER TABLE partners ADD COLUMN encrypted_credentials TEXT;
    END IF;
END $$;

-- ==============================================
-- 2. ENSURE SHARED MPESA CREDENTIALS TABLE EXISTS
-- ==============================================

CREATE TABLE IF NOT EXISTS shared_mpesa_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    environment TEXT NOT NULL DEFAULT 'sandbox',
    consumer_key TEXT,
    consumer_secret TEXT,
    initiator_password TEXT,
    security_credential TEXT,
    initiator_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. INSERT DEFAULT SHARED CREDENTIALS (SANDBOX)
-- ==============================================

INSERT INTO shared_mpesa_credentials (
    name, 
    environment, 
    consumer_key, 
    consumer_secret, 
    initiator_password, 
    security_credential, 
    initiator_name,
    is_active
)
SELECT 
    'default_sandbox',
    'sandbox',
    'YOUR_SANDBOX_CONSUMER_KEY',
    'YOUR_SANDBOX_CONSUMER_SECRET', 
    'YOUR_SANDBOX_INITIATOR_PASSWORD',
    'YOUR_SANDBOX_SECURITY_CREDENTIAL',
    'YOUR_SANDBOX_INITIATOR_NAME',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM shared_mpesa_credentials WHERE name = 'default_sandbox'
);

-- ==============================================
-- 4. UPDATE PARTNERS WITH SHARED CREDENTIALS
-- ==============================================

-- Update partners to use shared credentials if they don't have their own
UPDATE partners 
SET 
    consumer_key = smc.consumer_key,
    consumer_secret = smc.consumer_secret,
    initiator_password = smc.initiator_password,
    security_credential = smc.security_credential,
    initiator_name = smc.initiator_name,
    updated_at = NOW()
FROM shared_mpesa_credentials smc
WHERE partners.consumer_key IS NULL 
AND partners.is_active = true
AND smc.name = 'default_sandbox'
AND smc.is_active = true;

-- ==============================================
-- 5. VERIFY CREDENTIAL SETUP
-- ==============================================

SELECT 
    'CREDENTIAL SETUP VERIFICATION' as check_type,
    p.name as partner_name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    CASE WHEN p.consumer_key IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_key_status,
    CASE WHEN p.consumer_secret IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_secret_status,
    CASE WHEN p.initiator_password IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_password_status,
    CASE WHEN p.security_credential IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as security_credential_status,
    CASE WHEN p.initiator_name IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_name_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 6. SUMMARY OF ACTIONS TAKEN
-- ==============================================

SELECT 
    'ACTIONS TAKEN SUMMARY' as summary_type,
    'Added missing credential columns to partners table' as action_1,
    'Created shared_mpesa_credentials table' as action_2,
    'Inserted default sandbox credentials' as action_3,
    'Updated partners with shared credentials' as action_4,
    'Next: Update credentials with actual values' as next_step;

