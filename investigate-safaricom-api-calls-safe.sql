-- Safe Investigation of Safaricom API Calls and Credentials
-- This script will work regardless of table structure

-- ==============================================
-- 1. CHECK PARTNERS TABLE STRUCTURE
-- ==============================================

SELECT 
    'PARTNERS TABLE STRUCTURE' as investigation_step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'partners'
ORDER BY ordinal_position;

-- ==============================================
-- 2. CHECK SHARED MPESA CREDENTIALS TABLE STRUCTURE
-- ==============================================

SELECT 
    'SHARED MPESA CREDENTIALS TABLE STRUCTURE' as investigation_step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'shared_mpesa_credentials'
ORDER BY ordinal_position;

-- ==============================================
-- 3. CHECK BASIC PARTNER INFORMATION
-- ==============================================

SELECT 
    'BASIC PARTNER INFORMATION' as investigation_step,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.is_mpesa_configured,
    p.is_active
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 4. CHECK SHARED MPESA CREDENTIALS DATA
-- ==============================================

SELECT 
    'SHARED MPESA CREDENTIALS DATA' as investigation_step,
    smc.name,
    smc.environment,
    smc.is_active,
    CASE 
        WHEN smc.consumer_key IS NOT NULL THEN 'Has Consumer Key'
        ELSE 'No Consumer Key'
    END as consumer_key_status,
    CASE 
        WHEN smc.consumer_secret IS NOT NULL THEN 'Has Consumer Secret'
        ELSE 'No Consumer Secret'
    END as consumer_secret_status,
    CASE 
        WHEN smc.initiator_password IS NOT NULL THEN 'Has Initiator Password'
        ELSE 'No Initiator Password'
    END as initiator_password_status,
    CASE 
        WHEN smc.security_credential IS NOT NULL THEN 'Has Security Credential'
        ELSE 'No Security Credential'
    END as security_credential_status
FROM shared_mpesa_credentials smc
ORDER BY smc.name;

-- ==============================================
-- 5. CHECK RECENT BALANCE REQUESTS
-- ==============================================

SELECT 
    'RECENT BALANCE REQUESTS' as investigation_step,
    p.name as partner_name,
    p.mpesa_shortcode,
    br.conversation_id,
    br.originator_conversation_id,
    br.initiator_name,
    br.status,
    br.result_code,
    br.result_desc,
    br.utility_account_balance,
    br.working_account_balance,
    br.charges_account_balance,
    br.created_at,
    br.callback_received_at,
    CASE 
        WHEN br.callback_received_at IS NULL AND br.created_at < NOW() - INTERVAL '5 minutes' THEN 'No Callback Received'
        WHEN br.status = 'completed' THEN 'Success'
        WHEN br.status = 'failed' THEN 'Failed'
        WHEN br.status = 'pending' THEN 'Pending'
        ELSE 'Unknown'
    END as request_status
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY br.created_at DESC;

-- ==============================================
-- 6. CHECK MPESA API REQUEST FORMAT
-- ==============================================

SELECT 
    'MPESA API REQUEST FORMAT' as investigation_step,
    p.name as partner_name,
    p.mpesa_shortcode,
    br.initiator_name,
    br.mpesa_response,
    br.created_at
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '24 hours'
AND br.mpesa_response IS NOT NULL
ORDER BY br.created_at DESC
LIMIT 3;

-- ==============================================
-- 7. CHECK ENVIRONMENT CONFIGURATION
-- ==============================================

SELECT 
    'ENVIRONMENT CONFIGURATION' as investigation_step,
    p.name as partner_name,
    p.mpesa_environment,
    CASE 
        WHEN p.mpesa_environment = 'production' THEN 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query'
        ELSE 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query'
    END as api_url,
    CASE 
        WHEN p.mpesa_environment = 'production' THEN 'https://api.safaricom.co.ke/oauth/v1/generate'
        ELSE 'https://sandbox.safaricom.co.ke/oauth/v1/generate'
    END as auth_url
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 8. SUMMARY OF FINDINGS
-- ==============================================

SELECT 
    'SUMMARY OF FINDINGS' as investigation_step,
    'Check table structures above' as step_1,
    'Verify partner credentials exist' as step_2,
    'Check shared credentials are configured' as step_3,
    'Review recent balance requests' as step_4,
    'Verify API request format' as step_5,
    'Check environment configuration' as step_6,
    'Identify missing credentials or configuration issues' as step_7;

