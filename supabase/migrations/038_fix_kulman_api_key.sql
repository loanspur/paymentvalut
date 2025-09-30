-- Fix Kulman API key to match the working one from documentation
-- The working API key is: kulmna_sk_live_1234567890abcdef
-- This matches the hash: 59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539

-- Update Kulman partner with the correct working API key
UPDATE partners 
SET 
    api_key = 'kulmna_sk_live_1234567890abcdef',
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000' 
AND name = 'Kulman Group Limited';

-- Verify the update
SELECT 
    id, 
    name, 
    api_key,
    api_key_hash,
    CASE WHEN api_key IS NOT NULL AND api_key != '' THEN 'HAS_API_KEY' ELSE 'MISSING' END as api_key_status,
    is_mpesa_configured,
    is_active
FROM partners 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
