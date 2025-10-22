-- Check if security credentials are properly saved in partner forms
-- This will help us verify if the credentials are being retrieved correctly

-- Check all security credential related fields for each partner
SELECT 
    'SAVED SECURITY CREDENTIALS' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN 'HAS_SECURITY_CREDENTIAL'
        ELSE 'MISSING_SECURITY_CREDENTIAL'
    END as security_credential_status,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN LENGTH(p.security_credential)
        ELSE 0
    END as security_credential_length,
    CASE 
        WHEN p.initiator_password IS NOT NULL THEN 'HAS_INITIATOR_PASSWORD'
        ELSE 'MISSING_INITIATOR_PASSWORD'
    END as initiator_password_status,
    CASE 
        WHEN p.initiator_password IS NOT NULL THEN LENGTH(p.initiator_password)
        ELSE 0
    END as initiator_password_length,
    CASE 
        WHEN p.encrypted_credentials IS NOT NULL THEN 'HAS_ENCRYPTED_CREDENTIALS'
        ELSE 'MISSING_ENCRYPTED_CREDENTIALS'
    END as encrypted_credentials_status,
    CASE 
        WHEN p.encrypted_credentials IS NOT NULL THEN LENGTH(p.encrypted_credentials)
        ELSE 0
    END as encrypted_credentials_length
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- Check if security credentials are different from initiator passwords
SELECT 
    'CREDENTIAL COMPARISON' as check_type,
    p.name,
    p.mpesa_shortcode,
    CASE 
        WHEN p.security_credential = p.initiator_password THEN 'SAME_AS_INITIATOR_PASSWORD'
        WHEN p.security_credential IS NOT NULL AND p.initiator_password IS NOT NULL THEN 'DIFFERENT_FROM_INITIATOR_PASSWORD'
        WHEN p.security_credential IS NULL AND p.initiator_password IS NOT NULL THEN 'USING_INITIATOR_PASSWORD_AS_FALLBACK'
        ELSE 'NO_CREDENTIALS_AVAILABLE'
    END as credential_source,
    CASE 
        WHEN p.security_credential IS NOT NULL AND LENGTH(p.security_credential) > 200 THEN 'LIKELY_ENCRYPTED'
        WHEN p.security_credential IS NOT NULL AND LENGTH(p.security_credential) <= 200 THEN 'LIKELY_PLAIN_TEXT'
        ELSE 'NO_SECURITY_CREDENTIAL'
    END as encryption_analysis
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

