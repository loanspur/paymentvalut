-- Confirm Kulman Group has correct production credentials
-- B2C transactions do not require passkey as confirmed by Safaricom

UPDATE partners 
SET 
    mpesa_shortcode = '3037935',  -- Correct shortcode as confirmed by user
    mpesa_passkey = '',  -- B2C transactions do not require passkey
    mpesa_environment = 'production',
    is_mpesa_configured = true,
    updated_at = NOW()
WHERE id = '0f925383-8297-423b-b8d6-1d8777263fa8' 
AND name = 'KULMAN GROUP';

-- Add comment about B2C not requiring passkey
COMMENT ON COLUMN partners.mpesa_passkey IS 'Not required for B2C transactions - confirmed by Safaricom';


