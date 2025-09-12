-- Fix Kulman Group API key hash to match the actual API key
-- API Key: kulmna_sk_live_1234567890abcdef
-- Correct Hash: 59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539

-- Update Kulman Group Limited with correct API key hash
UPDATE partners 
SET 
    api_key_hash = '59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539'
WHERE id = '550e8400-e29b-41d4-a716-446655440000' 
AND name = 'Kulman Group Limited';
