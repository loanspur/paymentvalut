-- Fix the API key hash for the new KULMAN GROUP partner
-- The system expects API key: kulmna_sk_live_1234567890abcdef
-- Correct hash: 59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539

-- Update the new KULMAN GROUP partner with correct API key hash
UPDATE partners 
SET 
    api_key_hash = '59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539'
WHERE name = 'KULMAN GROUP' 
AND short_code = 'KULMAN';

-- Verify the update
SELECT 
    id,
    name,
    short_code,
    api_key_hash,
    mpesa_shortcode,
    mpesa_environment,
    is_mpesa_configured
FROM partners 
WHERE name = 'KULMAN GROUP';


