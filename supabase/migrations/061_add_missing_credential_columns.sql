-- Add missing credential columns to partners table
-- This fixes the issue where vault storage fails due to missing columns

-- Add encrypted_credentials column for vault storage
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT;

-- Add individual credential columns for fallback
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS consumer_key TEXT;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS consumer_secret TEXT;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS initiator_password TEXT;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS security_credential TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partners_encrypted_credentials 
ON partners(encrypted_credentials) 
WHERE encrypted_credentials IS NOT NULL;

-- Update existing partners with credentials from mpesa_* columns
UPDATE partners 
SET 
  consumer_key = mpesa_consumer_key,
  consumer_secret = mpesa_consumer_secret,
  initiator_password = mpesa_initiator_password,
  security_credential = COALESCE(security_credential, mpesa_initiator_password)
WHERE 
  mpesa_consumer_key IS NOT NULL 
  AND mpesa_consumer_secret IS NOT NULL 
  AND mpesa_initiator_password IS NOT NULL;
