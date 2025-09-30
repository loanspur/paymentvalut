-- Add security_credential column to partners table
-- This column stores the RSA-encrypted SecurityCredential for M-Pesa B2C transactions

-- Add the security_credential column if it doesn't exist
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS security_credential TEXT;

-- Add comment to clarify the field purpose
COMMENT ON COLUMN partners.security_credential IS 'RSA-encrypted SecurityCredential for M-Pesa B2C transactions - must be encrypted with Safaricom public certificate';

-- Create an index for better performance when retrieving credentials
CREATE INDEX IF NOT EXISTS idx_partners_security_credential 
ON partners(security_credential) 
WHERE security_credential IS NOT NULL;
