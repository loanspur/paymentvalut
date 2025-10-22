-- Check initiator names for all partners
-- This will help us identify the correct initiator names to use

SELECT 
    'PARTNER INITIATOR NAMES' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    p.is_mpesa_configured,
    CASE 
        WHEN p.mpesa_initiator_name IS NOT NULL THEN 'HAS_INITIATOR_NAME'
        ELSE 'MISSING_INITIATOR_NAME'
    END as initiator_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- Check if there are any other initiator-related fields
SELECT 
    'INITIATOR FIELDS CHECK' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'partners' 
  AND (column_name LIKE '%initiator%' OR column_name LIKE '%mpesa%')
ORDER BY column_name;

