-- Add mpesa_initiator_password field to partners table
-- This is required for M-Pesa B2C SecurityCredential generation

ALTER TABLE partners 
ADD COLUMN mpesa_initiator_password TEXT;

-- Add comment to clarify the field purpose
COMMENT ON COLUMN partners.mpesa_initiator_password IS 'M-Pesa B2C InitiatorPassword used for SecurityCredential generation';


