-- Setup Kulman Group for sandbox testing
-- This migration configures the partner for sandbox testing before production

UPDATE partners 
SET 
    mpesa_environment = 'sandbox',  -- Switch to sandbox for testing
    mpesa_shortcode = '174379',  -- Sandbox shortcode
    mpesa_consumer_key = 'YOUR_SANDBOX_CONSUMER_KEY',  -- Replace with sandbox consumer key
    mpesa_consumer_secret = 'YOUR_SANDBOX_CONSUMER_SECRET',  -- Replace with sandbox consumer secret
    mpesa_passkey = 'YOUR_SANDBOX_PASSKEY',  -- Replace with sandbox passkey
    mpesa_initiator_name = 'testapi',  -- Sandbox initiator name
    is_mpesa_configured = true,
    updated_at = NOW()
WHERE id = '0f925383-8297-423b-b8d6-1d8777263fa8' 
AND name = 'KULMAN GROUP';

-- Note: You need to replace the placeholder values with actual sandbox credentials
-- Sandbox credentials can be obtained from: https://developer.safaricom.co.ke/


