-- Check current initiator names for all partners
SELECT 
    'CURRENT INITIATOR NAMES' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    p.initiator_name,
    p.is_mpesa_configured,
    CASE 
        WHEN p.mpesa_initiator_name IS NOT NULL AND p.mpesa_initiator_name != '' THEN 'HAS_MPESA_INITIATOR'
        WHEN p.initiator_name IS NOT NULL AND p.initiator_name != '' THEN 'HAS_INITIATOR'
        ELSE 'MISSING_INITIATOR'
    END as initiator_status
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

