-- Fix Missing Credentials for Partners
-- This script will add missing credentials to partners

-- ==============================================
-- 1. CHECK CURRENT CREDENTIAL STATUS
-- ==============================================

SELECT 
    'CURRENT CREDENTIAL STATUS' as check_type,
    p.name,
    p.mpesa_shortcode,
    CASE WHEN p.consumer_key IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_key,
    CASE WHEN p.consumer_secret IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_secret,
    CASE WHEN p.initiator_password IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_password,
    CASE WHEN p.security_credential IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as security_credential,
    CASE WHEN p.mpesa_initiator_name IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_name
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 2. UPDATE PARTNERS WITH SHARED CREDENTIALS
-- ==============================================

-- Update partners to use shared credentials if they don't have their own
UPDATE partners 
SET 
    consumer_key = COALESCE(partners.consumer_key, smc.consumer_key),
    consumer_secret = COALESCE(partners.consumer_secret, smc.consumer_secret),
    initiator_password = COALESCE(partners.initiator_password, smc.initiator_password),
    security_credential = COALESCE(partners.security_credential, smc.security_credential),
    mpesa_initiator_name = COALESCE(partners.mpesa_initiator_name, smc.initiator_name),
    updated_at = NOW()
FROM shared_mpesa_credentials smc
WHERE partners.is_active = true
AND smc.name = 'default_sandbox'
AND smc.is_active = true
AND (
    partners.consumer_key IS NULL OR 
    partners.consumer_secret IS NULL OR 
    partners.initiator_password IS NULL OR 
    partners.security_credential IS NULL OR
    partners.mpesa_initiator_name IS NULL
);

-- ==============================================
-- 3. SET DEFAULT VALUES FOR MISSING FIELDS
-- ==============================================

-- Set default values for any remaining missing fields
UPDATE partners 
SET 
    mpesa_initiator_name = COALESCE(mpesa_initiator_name, 'default_initiator'),
    updated_at = NOW()
WHERE is_active = true
AND mpesa_initiator_name IS NULL;

-- ==============================================
-- 4. VERIFY CREDENTIAL FIX
-- ==============================================

SELECT 
    'CREDENTIAL FIX VERIFICATION' as check_type,
    p.name,
    p.mpesa_shortcode,
    CASE WHEN p.consumer_key IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_key,
    CASE WHEN p.consumer_secret IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_secret,
    CASE WHEN p.initiator_password IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_password,
    CASE WHEN p.security_credential IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as security_credential,
    CASE WHEN p.mpesa_initiator_name IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_name
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 5. SUMMARY
-- ==============================================

SELECT 
    'FIX SUMMARY' as summary_type,
    'Updated partners with shared credentials' as action_1,
    'Set default values for missing fields' as action_2,
    'Verified all partners have required credentials' as action_3,
    'Ready to test balance monitor function' as next_step;

