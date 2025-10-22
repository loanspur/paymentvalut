-- Investigate Safaricom API Calls and Credentials
-- This script will show exactly what credentials are being used and what callback URLs are configured

-- ==============================================
-- 1. CHECK PARTNERS TABLE STRUCTURE
-- ==============================================

SELECT 
    'PARTNERS TABLE STRUCTURE' as investigation_step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'partners'
AND column_name LIKE '%credential%' OR column_name LIKE '%mpesa%' OR column_name LIKE '%initiator%'
ORDER BY ordinal_position;

-- ==============================================
-- 1B. CHECK PARTNER CREDENTIALS DATA
-- ==============================================

SELECT 
    'PARTNER CREDENTIALS DATA' as investigation_step,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.is_mpesa_configured,
    CASE 
        WHEN p.encrypted_credentials IS NOT NULL THEN 'Has Encrypted Credentials'
        WHEN p.consumer_key IS NOT NULL THEN 'Has Plain Text Credentials'
        ELSE 'No Credentials Found'
    END as credential_type,
    CASE 
        WHEN p.consumer_key IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_consumer_key,
    CASE 
        WHEN p.consumer_secret IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_consumer_secret,
    CASE 
        WHEN p.initiator_password IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_initiator_password,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_security_credential
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 2. CHECK SHARED MPESA CREDENTIALS TABLE STRUCTURE
-- ==============================================

SELECT 
    'SHARED MPESA CREDENTIALS TABLE STRUCTURE' as investigation_step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'shared_mpesa_credentials'
ORDER BY ordinal_position;

-- ==============================================
-- 2B. CHECK SHARED MPESA CREDENTIALS DATA
-- ==============================================

SELECT 
    'SHARED MPESA CREDENTIALS DATA' as investigation_step,
    smc.name,
    smc.environment,
    smc.is_active,
    CASE 
        WHEN smc.consumer_key IS NOT NULL THEN 'Has Plain Text Credentials'
        ELSE 'No Credentials Found'
    END as credential_type,
    CASE 
        WHEN smc.consumer_key IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_consumer_key,
    CASE 
        WHEN smc.consumer_secret IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_consumer_secret,
    CASE 
        WHEN smc.initiator_password IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_initiator_password,
    CASE 
        WHEN smc.security_credential IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_security_credential
FROM shared_mpesa_credentials smc
ORDER BY smc.name;

-- ==============================================
-- 3. CHECK RECENT BALANCE REQUESTS AND THEIR CREDENTIALS
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
-- 4. CHECK MPESA API REQUEST FORMAT
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
-- 5. CHECK CALLBACK URL CONFIGURATION
-- ==============================================

SELECT 
    'CALLBACK URL CONFIGURATION' as investigation_step,
    'Current Supabase URL' as setting_name,
    'https://your-project.supabase.co' as current_value,
    'Should be: https://your-project.supabase.co/functions/v1/mpesa-balance-result' as expected_value,
    'Check NEXT_PUBLIC_SUPABASE_URL environment variable' as action_needed;

-- ==============================================
-- 6. CHECK ENVIRONMENT CONFIGURATION
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
-- 7. CHECK CREDENTIAL DECRYPTION ISSUES
-- ==============================================

SELECT 
    'CREDENTIAL DECRYPTION ISSUES' as investigation_step,
    p.name as partner_name,
    CASE 
        WHEN p.encrypted_credentials IS NOT NULL THEN 'Has Encrypted Credentials - May Need Decryption'
        WHEN p.consumer_key IS NULL AND p.consumer_secret IS NULL THEN 'No Credentials - Need to Add'
        ELSE 'Has Plain Text Credentials - Should Work'
    END as credential_status,
    CASE 
        WHEN p.encrypted_credentials IS NOT NULL THEN 'Check MPESA_VAULT_PASSPHRASE environment variable'
        WHEN p.consumer_key IS NULL THEN 'Add consumer_key to partners table'
        WHEN p.consumer_secret IS NULL THEN 'Add consumer_secret to partners table'
        WHEN p.initiator_password IS NULL THEN 'Add initiator_password to partners table'
        ELSE 'Credentials look good'
    END as action_needed
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 8. SUMMARY OF ISSUES FOUND
-- ==============================================

SELECT 
    'SUMMARY OF POTENTIAL ISSUES' as investigation_step,
    '1. Missing Credentials' as issue_1,
    '2. Wrong Environment URLs' as issue_2,
    '3. Incorrect Callback URLs' as issue_3,
    '4. Credential Decryption Problems' as issue_4,
    '5. Wrong API Request Format' as issue_5,
    '6. Missing Security Credential' as issue_6,
    '7. Wrong Initiator Name' as issue_7,
    '8. Missing PartyA (Shortcode)' as issue_8;
