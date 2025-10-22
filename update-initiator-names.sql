-- Update initiator names with standard patterns
-- These are common initiator name patterns that should work

-- Update Finsafe Limited initiator name
UPDATE partners 
SET mpesa_initiator_name = 'FinsafeAPI'
WHERE name = 'Finsafe Limited' 
  AND mpesa_shortcode = '4955284';

-- Update Kulman Group Limited initiator name
UPDATE partners 
SET mpesa_initiator_name = 'KulmanAPI'
WHERE name = 'Kulman Group Limited' 
  AND mpesa_shortcode = '3037935';

-- Verify the updates
SELECT 
    'UPDATED INITIATOR NAMES' as check_type,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    'UPDATED' as status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

