-- Check Kulman Group's current M-Pesa credentials
SELECT 
    id,
    name,
    mpesa_shortcode,
    mpesa_environment,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_initiator_name,
    mpesa_initiator_password IS NOT NULL as has_initiator_password,
    is_mpesa_configured
FROM partners 
WHERE name = 'KULMAN GROUP';





