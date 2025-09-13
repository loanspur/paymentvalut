-- Check the actual InitiatorPassword value for Kulman Group
SELECT 
    id,
    name,
    mpesa_initiator_name,
    mpesa_initiator_password,
    LENGTH(mpesa_initiator_password) as password_length,
    mpesa_shortcode,
    mpesa_environment
FROM partners 
WHERE name = 'KULMAN GROUP';





