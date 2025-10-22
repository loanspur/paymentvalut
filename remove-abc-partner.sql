-- Remove ABC BAL Limited Partner (Dummy Partner)
-- This script will safely remove the ABC BAL Limited partner and related data

-- ==============================================
-- 1. CHECK ABC BAL LIMITED DATA
-- ==============================================

SELECT 
    'ABC BAL LIMITED DATA CHECK' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.is_active,
    'Will be deleted' as action
FROM partners p
WHERE p.name = 'ABC BAL Limited';

-- ==============================================
-- 2. CHECK RELATED DATA
-- ==============================================

SELECT 
    'RELATED DATA CHECK' as check_type,
    'balance_requests' as table_name,
    COUNT(*) as record_count
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE p.name = 'ABC BAL Limited'

UNION ALL

SELECT 
    'RELATED DATA CHECK' as check_type,
    'disbursement_requests' as table_name,
    COUNT(*) as record_count
FROM disbursement_requests dr
JOIN partners p ON dr.partner_id = p.id
WHERE p.name = 'ABC BAL Limited'

UNION ALL

SELECT 
    'RELATED DATA CHECK' as check_type,
    'balance_monitoring_config' as table_name,
    COUNT(*) as record_count
FROM balance_monitoring_config bmc
JOIN partners p ON bmc.partner_id = p.id
WHERE p.name = 'ABC BAL Limited';

-- ==============================================
-- 3. DELETE RELATED DATA FIRST
-- ==============================================

-- Delete balance requests for ABC BAL Limited
DELETE FROM balance_requests 
WHERE partner_id IN (
    SELECT id FROM partners WHERE name = 'ABC BAL Limited'
);

-- Delete disbursement requests for ABC BAL Limited
DELETE FROM disbursement_requests 
WHERE partner_id IN (
    SELECT id FROM partners WHERE name = 'ABC BAL Limited'
);

-- Delete balance monitoring config for ABC BAL Limited
DELETE FROM balance_monitoring_config 
WHERE partner_id IN (
    SELECT id FROM partners WHERE name = 'ABC BAL Limited'
);

-- ==============================================
-- 4. DELETE ABC BAL LIMITED PARTNER
-- ==============================================

DELETE FROM partners 
WHERE name = 'ABC BAL Limited';

-- ==============================================
-- 5. VERIFY DELETION
-- ==============================================

SELECT 
    'DELETION VERIFICATION' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'ABC BAL Limited successfully deleted'
        ELSE 'ABC BAL Limited still exists'
    END as status
FROM partners 
WHERE name = 'ABC BAL Limited';

-- ==============================================
-- 6. SHOW REMAINING PARTNERS
-- ==============================================

SELECT 
    'REMAINING PARTNERS' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.is_active,
    p.is_mpesa_configured
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

