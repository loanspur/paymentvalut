-- Check if balance monitor function is actually being called and executed
-- This will help us understand why we only see "Listening on port" logs

-- ==============================================
-- 1. CHECK RECENT BALANCE REQUESTS
-- ==============================================

SELECT 
    'RECENT BALANCE REQUESTS' as check_type,
    br.id,
    br.partner_id,
    p.name as partner_name,
    br.conversation_id,
    br.status,
    br.created_at,
    br.updated_at,
    CASE 
        WHEN br.created_at > NOW() - INTERVAL '5 minutes' THEN 'VERY_RECENT'
        WHEN br.created_at > NOW() - INTERVAL '1 hour' THEN 'RECENT'
        ELSE 'OLD'
    END as request_age
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at > NOW() - INTERVAL '24 hours'
ORDER BY br.created_at DESC
LIMIT 10;

-- ==============================================
-- 2. CHECK BALANCE MONITORING CONFIG
-- ==============================================

SELECT 
    'BALANCE MONITORING CONFIG' as check_type,
    bmc.partner_id,
    p.name as partner_name,
    bmc.is_enabled,
    bmc.check_interval_minutes,
    bmc.last_checked_at,
    CASE 
        WHEN bmc.last_checked_at > NOW() - INTERVAL '5 minutes' THEN 'VERY_RECENT'
        WHEN bmc.last_checked_at > NOW() - INTERVAL '1 hour' THEN 'RECENT'
        ELSE 'OLD'
    END as last_check_age
FROM balance_monitoring_config bmc
JOIN partners p ON bmc.partner_id = p.id
WHERE p.is_active = true
ORDER BY bmc.last_checked_at DESC;

-- ==============================================
-- 3. CHECK PARTNER CREDENTIALS STATUS
-- ==============================================

SELECT 
    'PARTNER CREDENTIALS STATUS' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.is_mpesa_configured,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN 'HAS_SECURITY_CREDENTIAL'
        ELSE 'MISSING_SECURITY_CREDENTIAL'
    END as security_credential_status,
    CASE 
        WHEN p.consumer_key IS NOT NULL AND p.consumer_secret IS NOT NULL THEN 'HAS_CONSUMER_CREDENTIALS'
        ELSE 'MISSING_CONSUMER_CREDENTIALS'
    END as consumer_credentials_status,
    CASE 
        WHEN p.encrypted_credentials IS NOT NULL THEN 'HAS_ENCRYPTED_CREDENTIALS'
        ELSE 'MISSING_ENCRYPTED_CREDENTIALS'
    END as encrypted_credentials_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 4. CHECK FOR ANY ERROR LOGS IN BALANCE REQUESTS
-- ==============================================

-- First check the table structure
SELECT 
    'BALANCE REQUESTS TABLE STRUCTURE' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'balance_requests' 
ORDER BY ordinal_position;

-- Then check recent balance requests (without error_message column)
SELECT 
    'BALANCE REQUEST ERRORS' as check_type,
    br.id,
    br.partner_id,
    p.name as partner_name,
    br.status,
    br.created_at,
    br.updated_at
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.status = 'error' 
   OR br.created_at > NOW() - INTERVAL '1 hour'
ORDER BY br.created_at DESC
LIMIT 10;

-- ==============================================
-- 5. SUMMARY
-- ==============================================

SELECT 
    'EXECUTION SUMMARY' as summary_type,
    'Check if balance requests are being created' as step_1,
    'Verify monitoring config is enabled' as step_2,
    'Confirm partner credentials exist' as step_3,
    'Look for error messages in balance requests' as step_4,
    'Check if function is actually processing partners' as step_5;
