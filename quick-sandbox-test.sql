-- Quick test: Switch to sandbox environment
UPDATE partners 
SET mpesa_environment = 'sandbox'
WHERE name IN ('Finsafe Limited', 'Kulman Group Limited');

-- Verify the change
SELECT name, mpesa_environment, mpesa_initiator_name 
FROM partners 
WHERE name IN ('Finsafe Limited', 'Kulman Group Limited');

