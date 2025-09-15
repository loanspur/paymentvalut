-- Update Kulman Group Limited with REAL M-Pesa credentials
-- This migration should be updated with actual production credentials from Safaricom

-- Update Kulman Group Limited with real M-Pesa configuration
UPDATE partners 
SET 
    mpesa_shortcode = '174379',  -- Replace with Kulman's actual short code
    mpesa_consumer_key = 'KULMAN_REAL_CONSUMER_KEY',  -- Replace with actual consumer key from Safaricom
    mpesa_consumer_secret = 'KULMAN_REAL_CONSUMER_SECRET',  -- Replace with actual consumer secret from Safaricom
    mpesa_passkey = 'KULMAN_REAL_PASSKEY',  -- Replace with actual passkey from Safaricom
    mpesa_environment = 'production',  -- Use production environment for real transactions
    is_mpesa_configured = true,
    api_key_hash = '59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539'  -- Correct hash for kulmna_sk_live_1234567890abcdef
WHERE id = '550e8400-e29b-41d4-a716-446655440000' 
AND name = 'Kulman Group Limited';

-- Add missing columns for M-Pesa configuration
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_initiator_name TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_public_key TEXT;

-- Update Kulman Group with initiator name (this should come from Safaricom)
UPDATE partners 
SET mpesa_initiator_name = 'KULMAN_INITIATOR_NAME'  -- Replace with actual initiator name from Safaricom
WHERE id = '550e8400-e29b-41d4-a716-446655440000' 
AND name = 'Kulman Group Limited';








