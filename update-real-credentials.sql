-- Update with Real Safaricom Credentials
-- Replace the placeholder values with your actual Safaricom credentials

-- ==============================================
-- 1. UPDATE SANDBOX CREDENTIALS
-- ==============================================

-- Replace these with your actual sandbox credentials
UPDATE shared_mpesa_credentials 
SET 
    consumer_key = 'YOUR_ACTUAL_SANDBOX_CONSUMER_KEY',
    consumer_secret = 'YOUR_ACTUAL_SANDBOX_CONSUMER_SECRET',
    initiator_password = 'YOUR_ACTUAL_SANDBOX_INITIATOR_PASSWORD',
    security_credential = 'YOUR_ACTUAL_SANDBOX_SECURITY_CREDENTIAL',
    initiator_name = 'YOUR_ACTUAL_SANDBOX_INITIATOR_NAME',
    updated_at = NOW()
WHERE name = 'default_sandbox';

-- ==============================================
-- 2. UPDATE PARTNERS WITH REAL CREDENTIALS
-- ==============================================

-- Update all active partners to use the real sandbox credentials
UPDATE partners 
SET 
    consumer_key = smc.consumer_key,
    consumer_secret = smc.consumer_secret,
    initiator_password = smc.initiator_password,
    security_credential = smc.security_credential,
    initiator_name = smc.initiator_name,
    updated_at = NOW()
FROM shared_mpesa_credentials smc
WHERE partners.is_active = true
AND smc.name = 'default_sandbox'
AND smc.is_active = true;

-- ==============================================
-- 3. ADD PRODUCTION CREDENTIALS (OPTIONAL)
-- ==============================================

-- Uncomment and update if you have production credentials
/*
INSERT INTO shared_mpesa_credentials (
    name, environment, consumer_key, consumer_secret, 
    initiator_password, security_credential, initiator_name, is_active
) VALUES (
    'default_production', 'production', 
    'YOUR_ACTUAL_PRODUCTION_CONSUMER_KEY',
    'YOUR_ACTUAL_PRODUCTION_CONSUMER_SECRET',
    'YOUR_ACTUAL_PRODUCTION_INITIATOR_PASSWORD',
    'YOUR_ACTUAL_PRODUCTION_SECURITY_CREDENTIAL',
    'YOUR_ACTUAL_PRODUCTION_INITIATOR_NAME',
    true
);
*/

-- ==============================================
-- 4. VERIFY CREDENTIAL UPDATE
-- ==============================================

SELECT 
    'CREDENTIAL UPDATE VERIFICATION' as check_type,
    p.name as partner_name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    CASE WHEN p.consumer_key IS NOT NULL AND p.consumer_key != 'YOUR_SANDBOX_CONSUMER_KEY' THEN 'UPDATED' ELSE 'NEEDS_UPDATE' END as consumer_key_status,
    CASE WHEN p.consumer_secret IS NOT NULL AND p.consumer_secret != 'YOUR_SANDBOX_CONSUMER_SECRET' THEN 'UPDATED' ELSE 'NEEDS_UPDATE' END as consumer_secret_status,
    CASE WHEN p.initiator_password IS NOT NULL AND p.initiator_password != 'YOUR_SANDBOX_INITIATOR_PASSWORD' THEN 'UPDATED' ELSE 'NEEDS_UPDATE' END as initiator_password_status,
    CASE WHEN p.security_credential IS NOT NULL AND p.security_credential != 'YOUR_SANDBOX_SECURITY_CREDENTIAL' THEN 'UPDATED' ELSE 'NEEDS_UPDATE' END as security_credential_status,
    CASE WHEN p.initiator_name IS NOT NULL AND p.initiator_name != 'YOUR_SANDBOX_INITIATOR_NAME' THEN 'UPDATED' ELSE 'NEEDS_UPDATE' END as initiator_name_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 5. SUMMARY
-- ==============================================

SELECT 
    'UPDATE SUMMARY' as summary_type,
    'Replace placeholder values with real credentials' as step_1,
    'Run verification query to confirm updates' as step_2,
    'Test balance check functionality' as step_3,
    'Monitor for successful API calls' as step_4;

