-- Focused Credential Investigation
-- This script will get the specific data we need to fix the Safaricom API issues

-- ==============================================
-- 1. PARTNERS TABLE - CREDENTIAL COLUMNS
-- ==============================================

SELECT 
    'PARTNERS CREDENTIAL COLUMNS' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'partners'
AND (
    column_name LIKE '%credential%' OR 
    column_name LIKE '%mpesa%' OR 
    column_name LIKE '%initiator%' OR
    column_name LIKE '%consumer%'
)
ORDER BY column_name;

-- ==============================================
-- 2. PARTNERS - ACTUAL CREDENTIAL DATA
-- ==============================================

SELECT 
    'PARTNERS CREDENTIAL DATA' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.is_mpesa_configured,
    -- Check if credential columns exist and have data
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'consumer_key') 
        THEN CASE WHEN p.consumer_key IS NOT NULL THEN 'HAS' ELSE 'MISSING' END
        ELSE 'COLUMN_NOT_EXISTS'
    END as consumer_key_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'consumer_secret') 
        THEN CASE WHEN p.consumer_secret IS NOT NULL THEN 'HAS' ELSE 'MISSING' END
        ELSE 'COLUMN_NOT_EXISTS'
    END as consumer_secret_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'initiator_password') 
        THEN CASE WHEN p.initiator_password IS NOT NULL THEN 'HAS' ELSE 'MISSING' END
        ELSE 'COLUMN_NOT_EXISTS'
    END as initiator_password_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'security_credential') 
        THEN CASE WHEN p.security_credential IS NOT NULL THEN 'HAS' ELSE 'MISSING' END
        ELSE 'COLUMN_NOT_EXISTS'
    END as security_credential_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 3. SHARED MPESA CREDENTIALS - ACTUAL DATA
-- ==============================================

SELECT 
    'SHARED CREDENTIALS DATA' as check_type,
    smc.name,
    smc.environment,
    smc.is_active,
    CASE WHEN smc.consumer_key IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_key_status,
    CASE WHEN smc.consumer_secret IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_secret_status,
    CASE WHEN smc.initiator_password IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_password_status,
    CASE WHEN smc.security_credential IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as security_credential_status
FROM shared_mpesa_credentials smc
ORDER BY smc.name;

-- ==============================================
-- 4. RECENT BALANCE REQUESTS - FAILED ONES
-- ==============================================

SELECT 
    'FAILED BALANCE REQUESTS' as check_type,
    p.name as partner_name,
    p.mpesa_shortcode,
    br.status,
    br.result_code,
    br.result_desc,
    br.initiator_name,
    br.created_at,
    br.mpesa_response
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '7 days'
AND (br.status = 'failed' OR br.result_code != '0')
ORDER BY br.created_at DESC
LIMIT 10;

-- ==============================================
-- 5. SUCCESSFUL BALANCE REQUESTS
-- ==============================================

SELECT 
    'SUCCESSFUL BALANCE REQUESTS' as check_type,
    p.name as partner_name,
    p.mpesa_shortcode,
    br.status,
    br.result_code,
    br.result_desc,
    br.utility_account_balance,
    br.working_account_balance,
    br.charges_account_balance,
    br.created_at,
    br.callback_received_at
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '7 days'
AND br.status = 'completed'
ORDER BY br.created_at DESC
LIMIT 5;

-- ==============================================
-- 6. BALANCE MONITORING CONFIG STATUS
-- ==============================================

SELECT 
    'BALANCE MONITORING CONFIG' as check_type,
    p.name as partner_name,
    bmc.is_enabled,
    bmc.check_interval_minutes,
    bmc.last_checked_at,
    CASE 
        WHEN bmc.last_checked_at IS NULL THEN 'NEVER_CHECKED'
        WHEN bmc.last_checked_at < NOW() - INTERVAL '1 hour' THEN 'STALE'
        ELSE 'RECENT'
    END as check_status
FROM partners p
LEFT JOIN balance_monitoring_config bmc ON p.id = bmc.partner_id
WHERE p.is_active = true
ORDER BY p.name;

