-- Fix initiator names for partners
-- This script will help us set the correct initiator names

-- First, let's see what initiator names we currently have
SELECT 
    'CURRENT INITIATOR NAMES' as check_type,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    CASE 
        WHEN p.mpesa_initiator_name IS NULL OR p.mpesa_initiator_name = '' THEN 'NEEDS_UPDATE'
        ELSE 'HAS_VALUE'
    END as status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- Update initiator names based on common patterns
-- Note: These are common initiator names, but you should verify with your M-Pesa account

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

