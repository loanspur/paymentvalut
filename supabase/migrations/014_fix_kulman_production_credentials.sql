-- Fix Kulman Group production credentials
-- This migration corrects the M-Pesa configuration for production use

UPDATE partners 
SET 
    mpesa_shortcode = '174379',  -- Correct M-Pesa B2C shortcode
    mpesa_passkey = 'YOUR_PRODUCTION_PASSKEY',  -- Replace with actual passkey from Safaricom
    mpesa_environment = 'production',
    is_mpesa_configured = true,
    updated_at = NOW()
WHERE id = '0f925383-8297-423b-b8d6-1d8777263fa8' 
AND name = 'KULMAN GROUP';

-- Note: You need to replace 'YOUR_PRODUCTION_PASSKEY' with the actual passkey from Safaricom
-- The passkey is required for generating the SecurityCredential in production





