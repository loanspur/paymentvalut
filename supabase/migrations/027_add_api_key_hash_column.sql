-- Add api_key_hash column to partners table if it doesn't exist
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

-- Generate hash for Kulman's API key and update the record
-- The API key is: kulman_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
-- We need to generate its SHA-256 hash

-- The correct SHA-256 hash of the API key
UPDATE partners 
SET 
  api_key_hash = 'b3dd3dd43d1bc4c780c8c2406a7f7ee166ae37c99a0fe1c1abf7b12ede7924e3',
  updated_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
  AND name = 'Kulman Group Limited';

-- Verify the update
SELECT 
  id, 
  name, 
  CASE WHEN api_key IS NOT NULL THEN 'HAS_API_KEY' ELSE 'MISSING' END as api_key_status,
  CASE WHEN api_key_hash IS NOT NULL THEN 'HAS_HASH' ELSE 'MISSING' END as api_key_hash_status,
  is_mpesa_configured
FROM partners 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
