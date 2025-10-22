-- Check ABC BAL Limited Credentials
-- This script will show exactly what credentials are stored for ABC BAL Limited

-- ==============================================
-- 1. CHECK ABC BAL LIMITED CREDENTIALS
-- ==============================================

SELECT 
    'ABC BAL LIMITED CREDENTIALS' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.is_mpesa_configured,
    p.mpesa_initiator_name,
    CASE WHEN p.consumer_key IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_key_status,
    CASE WHEN p.consumer_secret IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as consumer_secret_status,
    CASE WHEN p.initiator_password IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as initiator_password_status,
    CASE WHEN p.security_credential IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as security_credential_status,
    CASE WHEN p.encrypted_credentials IS NOT NULL THEN 'HAS' ELSE 'MISSING' END as encrypted_credentials_status
FROM partners p
WHERE p.name = 'ABC BAL Limited'
ORDER BY p.name;

-- ==============================================
-- 2. CHECK SHARED CREDENTIALS
-- ==============================================

SELECT 
    'SHARED CREDENTIALS' as check_type,
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
-- 3. CHECK RECENT DISBURSEMENTS FOR ABC BAL
-- ==============================================

SELECT 
    'ABC BAL RECENT DISBURSEMENTS' as check_type,
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
WHERE p.name = 'ABC BAL Limited'
AND dr.created_at >= NOW() - INTERVAL '7 days'
ORDER BY dr.created_at DESC
LIMIT 5;

-- ==============================================
-- 4. CHECK ALL PARTNERS CREDENTIAL STATUS
-- ==============================================

SELECT 
    'ALL PARTNERS CREDENTIAL STATUS' as check_type,
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

