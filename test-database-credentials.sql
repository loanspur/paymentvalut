-- Test query to check Kulman Group's current database credentials
-- Run this in Supabase Dashboard SQL Editor

SELECT 
    id,
    name,
    mpesa_shortcode,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_environment,
    is_mpesa_configured,
    mpesa_initiator_name,
    api_key_hash,
    is_active
FROM partners 
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
OR name LIKE '%Kulman%'
OR name LIKE '%Kulmn%';

-- Expected results if credentials are properly set:
-- mpesa_consumer_key should NOT contain "YOUR_MPESA_CONSUMER_KEY_1"
-- mpesa_environment should be "production" not "sandbox"
-- mpesa_initiator_name should NOT be NULL
-- api_key_hash should be "59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539"


