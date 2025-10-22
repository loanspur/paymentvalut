-- Sync Balance Monitor with Disburse Function Credentials
-- This script ensures the balance monitor uses the same credential approach as the working disburse function

-- ==============================================
-- 1. VERIFY PARTNERS HAVE CREDENTIALS
-- ==============================================

SELECT 
    'PARTNER CREDENTIAL VERIFICATION' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.is_mpesa_configured,
    CASE WHEN p.consumer_key IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_key_status,
    CASE WHEN p.consumer_secret IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_secret_status,
    CASE WHEN p.initiator_password IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_password_status,
    CASE WHEN p.security_credential IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as security_credential_status,
    CASE WHEN p.mpesa_initiator_name IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_name_status,
    CASE WHEN p.encrypted_credentials IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as encrypted_credentials_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 2. CHECK RECENT DISBURSEMENTS FOR BALANCE DATA
-- ==============================================

SELECT 
    'RECENT DISBURSEMENTS WITH BALANCE DATA' as check_type,
    p.name as partner_name,
    p.mpesa_shortcode,
    dr.id as disbursement_id,
    dr.status,
    dr.utility_balance_at_transaction,
    dr.working_balance_at_transaction,
    dr.charges_balance_at_transaction,
    dr.created_at,
    dr.updated_at
FROM disbursement_requests dr
JOIN partners p ON dr.partner_id = p.id
WHERE dr.created_at >= NOW() - INTERVAL '7 days'
AND (dr.utility_balance_at_transaction IS NOT NULL OR dr.working_balance_at_transaction IS NOT NULL)
ORDER BY dr.created_at DESC
LIMIT 10;

-- ==============================================
-- 3. CHECK RECENT BALANCE REQUESTS
-- ==============================================

SELECT 
    'RECENT BALANCE REQUESTS' as check_type,
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
ORDER BY br.created_at DESC
LIMIT 10;

-- ==============================================
-- 4. COMPARE DISBURSEMENT VS BALANCE DATA
-- ==============================================

SELECT 
    'BALANCE DATA COMPARISON' as check_type,
    p.name as partner_name,
    p.mpesa_shortcode,
    'Disbursement Data' as data_source,
    dr.utility_balance_at_transaction as utility_balance,
    dr.working_balance_at_transaction as working_balance,
    dr.charges_balance_at_transaction as charges_balance,
    dr.updated_at as last_updated
FROM disbursement_requests dr
JOIN partners p ON dr.partner_id = p.id
WHERE dr.created_at >= NOW() - INTERVAL '7 days'
AND (dr.utility_balance_at_transaction IS NOT NULL OR dr.working_balance_at_transaction IS NOT NULL)
AND dr.id IN (
    SELECT id FROM disbursement_requests 
    WHERE partner_id = dr.partner_id 
    AND created_at >= NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT 1
)

UNION ALL

SELECT 
    'BALANCE DATA COMPARISON' as check_type,
    p.name as partner_name,
    p.mpesa_shortcode,
    'Balance Request Data' as data_source,
    br.utility_account_balance as utility_balance,
    br.working_account_balance as working_balance,
    br.charges_account_balance as charges_balance,
    br.updated_at as last_updated
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '7 days'
AND (br.utility_account_balance IS NOT NULL OR br.working_account_balance IS NOT NULL)
AND br.id IN (
    SELECT id FROM balance_requests 
    WHERE partner_id = br.partner_id 
    AND created_at >= NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT 1
)
ORDER BY partner_name, data_source;

-- ==============================================
-- 5. SUMMARY AND RECOMMENDATIONS
-- ==============================================

SELECT 
    'SYNC SUMMARY' as summary_type,
    'Balance monitor now uses same credential approach as disburse function' as action_1,
    'Check if partners have all required credential fields' as action_2,
    'Verify recent disbursements have balance data' as action_3,
    'Compare disbursement vs balance request data' as action_4,
    'Test balance check functionality' as action_5;
