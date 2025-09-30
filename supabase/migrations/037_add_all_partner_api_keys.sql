-- Add API keys for all partners to make the system fully dynamic
-- This migration ensures all partners have API keys configured

-- Update Kulman partner with API key (if not already set)
UPDATE partners 
SET 
    api_key = 'kulman_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000' 
AND name = 'Kulman Group Limited'
AND (api_key IS NULL OR api_key = '');

-- Update Finsafe partner with API key (if not already set)
UPDATE partners 
SET 
    api_key = 'finsef_sk_live_1234567890abcdef',
    updated_at = NOW()
WHERE id = '660e8400-e29b-41d4-a716-446655440001' 
AND name = 'Finsef Limited'
AND (api_key IS NULL OR api_key = '');

-- Update ABC Limited partner with API key (if not already set)
UPDATE partners 
SET 
    api_key = 'abc_sk_live_1234567890abcdef',
    updated_at = NOW()
WHERE id = '770e8400-e29b-41d4-a716-446655440002' 
AND name = 'ABC Limited'
AND (api_key IS NULL OR api_key = '');

-- Update Coleman partner with API key (if not already set)
UPDATE partners 
SET 
    api_key = 'coleman_sk_live_1234567890abcdef',
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440098' 
AND name = 'Coleman Limited'
AND (api_key IS NULL OR api_key = '');

-- Verify all partners have API keys
SELECT 
    id, 
    name, 
    api_key,
    CASE WHEN api_key IS NOT NULL AND api_key != '' THEN 'HAS_API_KEY' ELSE 'MISSING' END as api_key_status,
    is_mpesa_configured,
    is_active
FROM partners 
ORDER BY name;
