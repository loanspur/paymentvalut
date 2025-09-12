-- Add api_key column to partners table if it doesn't exist
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Add API key for Kulman partner
UPDATE partners 
SET 
  api_key = 'kulman_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  updated_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
  AND name = 'Kulman Group Limited';

-- Verify the update
SELECT 
  id, 
  name, 
  CASE WHEN api_key IS NOT NULL THEN 'HAS_API_KEY' ELSE 'MISSING' END as api_key_status,
  is_mpesa_configured
FROM partners 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
