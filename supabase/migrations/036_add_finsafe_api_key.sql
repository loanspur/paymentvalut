-- Add API key for Finsafe partner
-- This migration adds the actual API key for Finsafe Limited

-- Update Finsafe partner with API key
UPDATE partners 
SET 
    api_key = 'finsef_sk_live_1234567890abcdef',
    updated_at = NOW()
WHERE id = '660e8400-e29b-41d4-a716-446655440001' 
AND name = 'Finsef Limited';

-- Verify the update
SELECT 
    id, 
    name, 
    api_key,
    CASE WHEN api_key IS NOT NULL THEN 'HAS_API_KEY' ELSE 'MISSING' END as api_key_status,
    CASE WHEN api_key_hash IS NOT NULL THEN 'HAS_HASH' ELSE 'MISSING' END as api_key_hash_status,
    is_mpesa_configured
FROM partners 
WHERE id = '660e8400-e29b-41d4-a716-446655440001';
