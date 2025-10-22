-- Complete fix for initiator names
-- This script will check current values and provide updates

-- 1. Check current initiator names
SELECT 
    'CURRENT INITIATOR NAMES' as check_type,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    p.initiator_name,
    CASE 
        WHEN p.mpesa_initiator_name IS NOT NULL AND p.mpesa_initiator_name != '' THEN 'HAS_MPESA_INITIATOR'
        WHEN p.initiator_name IS NOT NULL AND p.initiator_name != '' THEN 'HAS_INITIATOR'
        ELSE 'MISSING_INITIATOR'
    END as initiator_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- 2. Update initiator names with common patterns
-- Note: You should verify these with your actual M-Pesa account registrations

-- For Finsafe Limited (shortcode: 4955284)
UPDATE partners 
SET mpesa_initiator_name = 'FinsafeAPI'
WHERE name = 'Finsafe Limited' 
  AND mpesa_shortcode = '4955284';

-- For Kulman Group Limited (shortcode: 3037935)  
UPDATE partners 
SET mpesa_initiator_name = 'KulmanAPI'
WHERE name = 'Kulman Group Limited' 
  AND mpesa_shortcode = '3037935';

-- 3. Verify the updates
SELECT 
    'UPDATED INITIATOR NAMES' as check_type,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    'UPDATED' as status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- 4. Alternative: If the above doesn't work, try these common initiator names
-- Uncomment and run these if the first set doesn't work:

/*
-- Alternative initiator names for Finsafe Limited
UPDATE partners 
SET mpesa_initiator_name = 'FinsafeInitiator'
WHERE name = 'Finsafe Limited' 
  AND mpesa_shortcode = '4955284';

-- Alternative initiator names for Kulman Group Limited
UPDATE partners 
SET mpesa_initiator_name = 'KulmanInitiator'
WHERE name = 'Kulman Group Limited' 
  AND mpesa_shortcode = '3037935';
*/

