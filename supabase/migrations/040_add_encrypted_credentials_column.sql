-- Add encrypted_credentials column to partners table
-- This column stores encrypted M-Pesa credentials for the vault system

-- Add the encrypted_credentials column if it doesn't exist
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT;

-- Add comment to clarify the field purpose
COMMENT ON COLUMN partners.encrypted_credentials IS 'Encrypted M-Pesa credentials stored in vault format for Edge Functions';

-- Create an index for better performance when retrieving credentials
CREATE INDEX IF NOT EXISTS idx_partners_encrypted_credentials 
ON partners(encrypted_credentials) 
WHERE encrypted_credentials IS NOT NULL;
