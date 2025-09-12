-- Add InitiatorPassword to Kulman Group Limited for proper B2C SecurityCredential generation
-- This is required for M-Pesa B2C transactions to work correctly

UPDATE partners 
SET 
    mpesa_initiator_password = 'YOUR_ACTUAL_INITIATOR_PASSWORD',  -- Replace with actual password from Safaricom
    updated_at = NOW()
WHERE id = '0f925383-8297-423b-b8d6-1d8777263fa8' 
AND name = 'KULMAN GROUP';

-- Also add initiator name if missing
UPDATE partners 
SET 
    mpesa_initiator_name = 'YOUR_ACTUAL_INITIATOR_NAME',  -- Replace with actual initiator name from Safaricom
    updated_at = NOW()
WHERE id = '0f925383-8297-423b-b8d6-1d8777263fa8' 
AND name = 'KULMAN GROUP'
AND (mpesa_initiator_name IS NULL OR mpesa_initiator_name = '');


