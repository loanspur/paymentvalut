-- Simple check for balance monitor execution issues
-- This script will help identify why the balance monitor function is not working

-- ==============================================
-- 1. CHECK IF MONITORING CONFIGS EXIST AND ARE ENABLED
-- ==============================================

SELECT 
    'MONITORING CONFIG STATUS' as check_type,
    bmc.partner_id,
    p.name as partner_name,
    bmc.is_enabled,
    bmc.check_interval_minutes,
    bmc.last_checked_at,
    CASE 
        WHEN bmc.last_checked_at IS NULL THEN 'NEVER_CHECKED'
        WHEN bmc.last_checked_at > NOW() - INTERVAL '5 minutes' THEN 'VERY_RECENT'
        WHEN bmc.last_checked_at > NOW() - INTERVAL '1 hour' THEN 'RECENT'
        ELSE 'OLD'
    END as last_check_status
FROM balance_monitoring_config bmc
JOIN partners p ON bmc.partner_id = p.id
WHERE p.is_active = true
ORDER BY bmc.last_checked_at DESC;

-- ==============================================
-- 2. CHECK RECENT BALANCE REQUESTS
-- ==============================================

SELECT 
    'RECENT BALANCE REQUESTS' as check_type,
    br.id,
    br.partner_id,
    p.name as partner_name,
    br.conversation_id,
    br.status,
    br.created_at,
    br.updated_at,
    CASE 
        WHEN br.created_at > NOW() - INTERVAL '5 minutes' THEN 'VERY_RECENT'
        WHEN br.created_at > NOW() - INTERVAL '1 hour' THEN 'RECENT'
        ELSE 'OLD'
    END as request_age
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at > NOW() - INTERVAL '24 hours'
ORDER BY br.created_at DESC
LIMIT 5;

-- ==============================================
-- 3. CHECK PARTNER CREDENTIALS
-- ==============================================

SELECT 
    'PARTNER CREDENTIALS' as check_type,
    p.id,
    p.name,
    p.mpesa_shortcode,
    p.is_mpesa_configured,
    CASE 
        WHEN p.security_credential IS NOT NULL THEN 'HAS'
        ELSE 'MISSING'
    END as security_credential,
    CASE 
        WHEN p.consumer_key IS NOT NULL AND p.consumer_secret IS NOT NULL THEN 'HAS'
        ELSE 'MISSING'
    END as consumer_credentials
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 4. SUMMARY
-- ==============================================

SELECT 
    'DIAGNOSIS SUMMARY' as summary_type,
    'If no monitoring configs: Function will return early' as issue_1,
    'If configs not enabled: Function will skip partners' as issue_2,
    'If no credentials: Function will fail with error' as issue_3,
    'If no recent requests: Function is not being called' as issue_4;

