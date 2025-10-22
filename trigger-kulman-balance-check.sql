-- Trigger Balance Check for Kulman
-- This script will help trigger a balance check for Kulman to get actual balance data

-- 1. First, let's check if Kulman exists and get their details
SELECT 
    'Kulman Partner Details' as info,
    id,
    name,
    short_code,
    mpesa_shortcode,
    is_active,
    is_mpesa_configured
FROM partners 
WHERE name ILIKE '%kulman%' OR short_code ILIKE '%kulman%';

-- 2. Check if Kulman has M-Pesa credentials configured
SELECT 
    'Kulman M-Pesa Credentials' as info,
    p.name,
    p.short_code,
    p.mpesa_shortcode,
    CASE 
        WHEN p.mpesa_shortcode IS NOT NULL THEN 'Shortcode configured'
        ELSE 'No shortcode'
    END as shortcode_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM shared_mpesa_credentials smc 
            WHERE smc.name = 'default' OR smc.name = 'kulman'
        ) THEN 'Shared credentials available'
        ELSE 'No shared credentials'
    END as credentials_status
FROM partners p
WHERE p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%';

-- 3. Check balance monitoring configuration for Kulman
SELECT 
    'Kulman Balance Monitoring Config' as info,
    p.name,
    bmc.working_account_threshold,
    bmc.utility_account_threshold,
    bmc.charges_account_threshold,
    bmc.check_interval_minutes,
    bmc.is_enabled,
    bmc.last_checked_at
FROM partners p
LEFT JOIN balance_monitoring_config bmc ON p.id = bmc.partner_id
WHERE p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%';

-- 4. Insert or update balance monitoring config for Kulman if missing
INSERT INTO balance_monitoring_config (
    partner_id,
    working_account_threshold,
    utility_account_threshold,
    charges_account_threshold,
    check_interval_minutes,
    slack_webhook_url,
    slack_channel,
    is_enabled,
    created_at,
    updated_at
)
SELECT 
    p.id,
    1000.00,
    500.00,
    200.00,
    15,
    '',
    '#mpesa-alerts',
    true,
    NOW(),
    NOW()
FROM partners p
WHERE (p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%')
AND NOT EXISTS (
    SELECT 1 FROM balance_monitoring_config bmc 
    WHERE bmc.partner_id = p.id
)
ON CONFLICT (partner_id) DO UPDATE SET
    is_enabled = true,
    updated_at = NOW();

-- 5. Check if there are any recent balance requests for Kulman
SELECT 
    'Recent Balance Requests for Kulman' as info,
    br.id,
    br.status,
    br.utility_account_balance,
    br.working_account_balance,
    br.charges_account_balance,
    br.created_at,
    br.updated_at,
    br.callback_received_at
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE (p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%')
ORDER BY br.created_at DESC
LIMIT 5;

-- 6. Summary - What needs to be done to get Kulman's balance
SELECT 
    'Action Required' as info,
    CASE 
        WHEN p.id IS NULL THEN 'Kulman partner not found - check partner name/shortcode'
        WHEN p.mpesa_shortcode IS NULL THEN 'Kulman needs M-Pesa shortcode configuration'
        WHEN NOT EXISTS (SELECT 1 FROM shared_mpesa_credentials) THEN 'Shared M-Pesa credentials need to be configured'
        WHEN NOT EXISTS (SELECT 1 FROM balance_requests br WHERE br.partner_id = p.id AND br.status = 'completed') THEN 'Need to trigger balance check for Kulman'
        ELSE 'Kulman should have balance data - check API response'
    END as required_action
FROM partners p
WHERE p.name ILIKE '%kulman%' OR p.short_code ILIKE '%kulman%'
LIMIT 1;

