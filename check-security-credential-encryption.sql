-- Check security credential encryption and initiator permissions
-- This will help identify if the issue is with credential encryption

-- Check current security credentials
SELECT 
    'SECURITY CREDENTIAL ANALYSIS' as check_type,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN 'HAS_SECURITY_CREDENTIAL'
        ELSE 'MISSING_SECURITY_CREDENTIAL'
    END as security_credential_status,
    CASE 
        WHEN p.security_credential IS NOT NULL AND LENGTH(p.security_credential) > 100 THEN 'LIKELY_ENCRYPTED'
        WHEN p.security_credential IS NOT NULL AND LENGTH(p.security_credential) <= 100 THEN 'LIKELY_PLAIN_TEXT'
        ELSE 'NO_SECURITY_CREDENTIAL'
    END as encryption_status,
    CASE 
        WHEN p.initiator_password IS NOT NULL THEN 'HAS_INITIATOR_PASSWORD'
        ELSE 'MISSING_INITIATOR_PASSWORD'
    END as initiator_password_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- Check if security credentials match initiator passwords (indicating plain text)
SELECT 
    'CREDENTIAL COMPARISON' as check_type,
    p.name,
    p.mpesa_shortcode,
    CASE 
        WHEN p.security_credential = p.initiator_password THEN 'SECURITY_CREDENTIAL_IS_PLAIN_PASSWORD'
        WHEN p.security_credential IS NOT NULL AND p.initiator_password IS NOT NULL THEN 'DIFFERENT_VALUES'
        ELSE 'CANNOT_COMPARE'
    END as credential_comparison
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

