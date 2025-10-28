-- CHECK FOR UMOJA PARTNER
-- Run this to see if there's a partner with short code "umoja"

SELECT 
    'Partner Check for UMOJA' as check_type,
    p.id,
    p.name,
    p.short_code,
    p.is_active,
    p.created_at
FROM partners p
WHERE p.short_code ILIKE '%umoja%'
   OR p.name ILIKE '%umoja%'
ORDER BY p.created_at DESC;

-- Also check all partners to see what's available
SELECT 
    'All Partners' as check_type,
    p.id,
    p.name,
    p.short_code,
    p.is_active
FROM partners p
WHERE p.is_active = true
ORDER BY p.short_code;
