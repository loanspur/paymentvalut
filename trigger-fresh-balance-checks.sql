-- Trigger Fresh Balance Checks for All Partners
-- This script will help trigger new balance checks to get fresh data

-- ==============================================
-- 1. CHECK CURRENT BALANCE MONITORING STATUS
-- ==============================================

SELECT 
    'CURRENT BALANCE MONITORING STATUS' as action,
    p.name as partner_name,
    p.mpesa_shortcode,
    bmc.is_enabled,
    bmc.check_interval_minutes,
    bmc.last_checked_at,
    CASE 
        WHEN bmc.last_checked_at IS NULL THEN 'Never Checked'
        WHEN bmc.last_checked_at < NOW() - INTERVAL '1 hour' THEN 'Needs Fresh Check'
        ELSE 'Recently Checked'
    END as check_status
FROM partners p
LEFT JOIN balance_monitoring_config bmc ON p.id = bmc.partner_id
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 2. ENABLE BALANCE MONITORING FOR ALL PARTNERS
-- ==============================================

-- Update balance monitoring config to enable checks
UPDATE balance_monitoring_config 
SET 
    is_enabled = true,
    check_interval_minutes = 15,  -- Check every 15 minutes
    last_checked_at = NULL,  -- Reset last checked to force immediate check
    updated_at = NOW()
WHERE partner_id IN (
    SELECT id FROM partners WHERE is_active = true
);

-- ==============================================
-- 3. INSERT MISSING BALANCE MONITORING CONFIGS
-- ==============================================

-- Insert balance monitoring config for partners that don't have it
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
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM balance_monitoring_config bmc 
    WHERE bmc.partner_id = p.id
)
ON CONFLICT (partner_id) DO UPDATE SET
    is_enabled = true,
    check_interval_minutes = 15,
    last_checked_at = NULL,
    updated_at = NOW();

-- ==============================================
-- 4. CHECK RECENT BALANCE REQUESTS STATUS
-- ==============================================

SELECT 
    'RECENT BALANCE REQUESTS STATUS' as action,
    p.name as partner_name,
    br.status,
    br.result_code,
    br.result_desc,
    br.utility_account_balance,
    br.working_account_balance,
    br.charges_account_balance,
    br.created_at,
    br.callback_received_at,
    CASE 
        WHEN br.callback_received_at IS NULL AND br.created_at < NOW() - INTERVAL '5 minutes' THEN 'No Callback Received'
        WHEN br.status = 'completed' THEN 'Success'
        WHEN br.status = 'failed' THEN 'Failed'
        WHEN br.status = 'pending' THEN 'Pending'
        ELSE 'Unknown'
    END as request_status
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY br.created_at DESC;

-- ==============================================
-- 5. SUMMARY OF ACTIONS TAKEN
-- ==============================================

SELECT 
    'ACTIONS TAKEN SUMMARY' as action,
    'Enabled balance monitoring for all active partners' as action_1,
    'Set check interval to 15 minutes' as action_2,
    'Reset last_checked_at to force immediate checks' as action_3,
    'Next step: Trigger balance checks via API or UI' as next_step;

-- ==============================================
-- 6. VERIFICATION - CHECK UPDATED STATUS
-- ==============================================

SELECT 
    'UPDATED BALANCE MONITORING STATUS' as verification,
    p.name as partner_name,
    p.mpesa_shortcode,
    bmc.is_enabled,
    bmc.check_interval_minutes,
    bmc.last_checked_at,
    CASE 
        WHEN bmc.is_enabled = true THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as monitoring_status
FROM partners p
LEFT JOIN balance_monitoring_config bmc ON p.id = bmc.partner_id
WHERE p.is_active = true
ORDER BY p.name;

