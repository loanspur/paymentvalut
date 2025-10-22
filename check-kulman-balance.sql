-- Check Kulman's balance data
-- This script will help us understand what balance data exists for Kulman

-- 1. Check if Kulman partner exists
SELECT 
    'Kulman Partner Info' as check_type,
    id,
    name,
    short_code,
    mpesa_shortcode,
    is_active,
    is_mpesa_configured
FROM partners 
WHERE name ILIKE '%kulman%' OR short_code ILIKE '%kulman%';

-- 2. Check recent balance requests for Kulman
SELECT 
    'Recent Balance Requests' as check_type,
    br.id,
    br.partner_id,
    p.name as partner_name,
    br.status,
    br.utility_account_balance,
    br.working_account_balance,
    br.charges_account_balance,
    br.balance_before,
    br.balance_after,
    br.created_at,
    br.updated_at,
    br.callback_received_at
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%'
ORDER BY br.created_at DESC
LIMIT 10;

-- 3. Check recent disbursement requests for Kulman (fallback data)
SELECT 
    'Recent Disbursement Requests' as check_type,
    dr.id,
    dr.partner_id,
    p.name as partner_name,
    dr.status,
    dr.utility_balance_at_transaction,
    dr.working_balance_at_transaction,
    dr.charges_balance_at_transaction,
    dr.balance_updated_at_transaction,
    dr.created_at,
    dr.updated_at
FROM disbursement_requests dr
JOIN partners p ON dr.partner_id = p.id
WHERE p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%'
ORDER BY dr.created_at DESC
LIMIT 10;

-- 4. Check balance monitoring config for Kulman
SELECT 
    'Balance Monitoring Config' as check_type,
    bmc.id,
    bmc.partner_id,
    p.name as partner_name,
    bmc.working_account_threshold,
    bmc.utility_account_threshold,
    bmc.charges_account_threshold,
    bmc.check_interval_minutes,
    bmc.is_enabled,
    bmc.last_checked_at
FROM balance_monitoring_config bmc
JOIN partners p ON bmc.partner_id = p.id
WHERE p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%';

-- 5. Summary of all partners and their balance data status
SELECT 
    'All Partners Balance Status' as check_type,
    p.id,
    p.name,
    p.short_code,
    CASE 
        WHEN br.id IS NOT NULL THEN 'Has Balance Request'
        WHEN dr.id IS NOT NULL THEN 'Has Disbursement Data'
        ELSE 'No Balance Data'
    END as balance_data_status,
    br.utility_account_balance as latest_utility_balance,
    br.working_account_balance as latest_working_balance,
    br.updated_at as latest_balance_update
FROM partners p
LEFT JOIN (
    SELECT DISTINCT ON (partner_id) 
        partner_id, 
        utility_account_balance, 
        working_account_balance, 
        updated_at,
        id
    FROM balance_requests 
    WHERE status = 'completed' 
    AND utility_account_balance IS NOT NULL
    ORDER BY partner_id, updated_at DESC
) br ON p.id = br.partner_id
LEFT JOIN (
    SELECT DISTINCT ON (partner_id) 
        partner_id, 
        id
    FROM disbursement_requests 
    WHERE utility_balance_at_transaction IS NOT NULL
    ORDER BY partner_id, created_at DESC
) dr ON p.id = dr.partner_id
WHERE p.is_active = true
ORDER BY p.name;

