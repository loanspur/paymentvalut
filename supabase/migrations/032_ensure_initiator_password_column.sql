-- Ensure mpesa_initiator_password column exists in partners table
-- This migration fixes the missing column error in the partners form

-- Add mpesa_initiator_password column if it doesn't exist
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS mpesa_initiator_password TEXT;

-- Add comment to clarify the field purpose
COMMENT ON COLUMN partners.mpesa_initiator_password IS 'M-Pesa B2C InitiatorPassword used for SecurityCredential generation';

-- Also ensure other required columns exist
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS mpesa_initiator_name TEXT;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS allowed_ips TEXT[] DEFAULT '{}';

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS ip_whitelist_enabled BOOLEAN DEFAULT false;

-- Update existing partners with default values if they are null
UPDATE partners 
SET 
    mpesa_initiator_password = COALESCE(mpesa_initiator_password, ''),
    mpesa_initiator_name = COALESCE(mpesa_initiator_name, ''),
    allowed_ips = COALESCE(allowed_ips, '{}'),
    ip_whitelist_enabled = COALESCE(ip_whitelist_enabled, false)
WHERE 
    mpesa_initiator_password IS NULL 
    OR mpesa_initiator_name IS NULL 
    OR allowed_ips IS NULL 
    OR ip_whitelist_enabled IS NULL;
