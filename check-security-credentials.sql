-- Check Security Credentials vs Plain Passwords
-- This script will show what type of credentials are stored for each partner

-- ==============================================
-- 1. CHECK CREDENTIAL TYPES FOR ALL PARTNERS
-- ==============================================

SELECT 
    'CREDENTIAL TYPE ANALYSIS' as check_type,
    p.name,
    p.mpesa_shortcode,
    CASE 
        WHEN p.security_credential IS NOT NULL AND p.security_credential != p.initiator_password THEN 'HAS_ENCRYPTED_SECURITY_CREDENTIAL'
        WHEN p.security_credential IS NOT NULL AND p.security_credential = p.initiator_password THEN 'USING_PLAIN_PASSWORD_AS_SECURITY_CREDENTIAL'
        WHEN p.security_credential IS NULL AND p.initiator_password IS NOT NULL THEN 'MISSING_SECURITY_CREDENTIAL_HAS_PASSWORD'
        ELSE 'NO_CREDENTIALS'
    END as credential_type,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN 'HAS' 
        ELSE 'MISSING' 
    END as security_credential_status,
    CASE 
        WHEN p.initiator_password IS NOT NULL THEN 'HAS' 
        ELSE 'MISSING' 
    END as initiator_password_status,
    CASE 
        WHEN p.encrypted_credentials IS NOT NULL THEN 'HAS' 
        ELSE 'MISSING' 
    END as encrypted_credentials_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 2. CHECK CREDENTIAL LENGTHS (to identify encrypted vs plain)
-- ==============================================

SELECT 
    'CREDENTIAL LENGTH ANALYSIS' as check_type,
    p.name,
    p.mpesa_shortcode,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN LENGTH(p.security_credential)
        ELSE 0
    END as security_credential_length,
    CASE 
        WHEN p.initiator_password IS NOT NULL THEN LENGTH(p.initiator_password)
        ELSE 0
    END as initiator_password_length,
    CASE 
        WHEN p.security_credential IS NOT NULL AND LENGTH(p.security_credential) > 50 THEN 'LIKELY_ENCRYPTED'
        WHEN p.security_credential IS NOT NULL AND LENGTH(p.security_credential) <= 50 THEN 'LIKELY_PLAIN_TEXT'
        ELSE 'NO_SECURITY_CREDENTIAL'
    END as security_credential_type,
    CASE 
        WHEN p.initiator_password IS NOT NULL AND LENGTH(p.initiator_password) > 50 THEN 'LIKELY_ENCRYPTED'
        WHEN p.initiator_password IS NOT NULL AND LENGTH(p.initiator_password) <= 50 THEN 'LIKELY_PLAIN_TEXT'
        ELSE 'NO_INITIATOR_PASSWORD'
    END as initiator_password_type
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 3. CHECK SHARED CREDENTIALS
-- ==============================================

SELECT 
    'SHARED CREDENTIALS ANALYSIS' as check_type,
    smc.name,
    smc.environment,
    CASE 
        WHEN smc.security_credential IS NOT NULL AND LENGTH(smc.security_credential) > 50 THEN 'LIKELY_ENCRYPTED'
        WHEN smc.security_credential IS NOT NULL AND LENGTH(smc.security_credential) <= 50 THEN 'LIKELY_PLAIN_TEXT'
        ELSE 'NO_SECURITY_CREDENTIAL'
    END as security_credential_type,
    CASE 
        WHEN smc.initiator_password IS NOT NULL AND LENGTH(smc.initiator_password) > 50 THEN 'LIKELY_ENCRYPTED'
        WHEN smc.initiator_password IS NOT NULL AND LENGTH(smc.initiator_password) <= 50 THEN 'LIKELY_PLAIN_TEXT'
        ELSE 'NO_INITIATOR_PASSWORD'
    END as initiator_password_type
FROM shared_mpesa_credentials smc
ORDER BY smc.name;

-- ==============================================
-- 4. SUMMARY
-- ==============================================

SELECT 
    'CREDENTIAL SUMMARY' as summary_type,
    'Check if partners have proper security credentials' as step_1,
    'Verify credentials are encrypted (length > 50)' as step_2,
    'Compare with working disburse function approach' as step_3,
    'Update balance monitor to match disburse function' as step_4;

