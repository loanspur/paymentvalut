-- Check M-Pesa environment configuration for Kulman Group
SELECT 
    id,
    name,
    mpesa_shortcode,
    mpesa_environment,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_initiator_name,
    is_mpesa_configured
FROM partners 
WHERE name = 'KULMAN GROUP' OR name = 'Kulman Group Limited'
ORDER BY created_at DESC;


