-- Restore Partner Configuration Settings
-- This script restores all the configuration settings for every partner that were there before

-- ==============================================
-- 1. RESTORE BALANCE MONITORING CONFIG
-- ==============================================

-- Insert default configurations for all partners that don't have them
INSERT INTO balance_monitoring_config (
    partner_id,
    working_account_threshold,
    utility_account_threshold,
    charges_account_threshold,
    check_interval_minutes,
    slack_webhook_url,
    slack_channel,
    is_enabled,
    last_checked_at,
    created_at,
    updated_at
)
SELECT 
    p.id as partner_id,
    1000.00 as working_account_threshold,
    500.00 as utility_account_threshold,
    200.00 as charges_account_threshold,
    15 as check_interval_minutes,
    '' as slack_webhook_url,
    '#mpesa-alerts' as slack_channel,
    true as is_enabled,
    NULL as last_checked_at,
    NOW() as created_at,
    NOW() as updated_at
FROM partners p
WHERE p.id NOT IN (
    SELECT partner_id FROM balance_monitoring_config WHERE partner_id IS NOT NULL
);

-- ==============================================
-- 2. RESTORE PARTNER BALANCE CONFIGS (LEGACY)
-- ==============================================

-- Insert default configurations for all partners that don't have them
INSERT INTO partner_balance_configs (
    partner_id,
    check_interval_minutes,
    is_monitoring_enabled,
    low_balance_threshold,
    unusual_drop_threshold,
    unusual_drop_percentage,
    slack_webhook_url,
    slack_channel,
    slack_mentions,
    notify_on_low_balance,
    notify_on_unusual_drop,
    notify_on_balance_recovery,
    created_at,
    updated_at,
    created_by
)
SELECT 
    p.id as partner_id,
    15 as check_interval_minutes,
    true as is_monitoring_enabled,
    1000.00 as low_balance_threshold,
    5000.00 as unusual_drop_threshold,
    20.00 as unusual_drop_percentage,
    '' as slack_webhook_url,
    '#mpesa-alerts' as slack_channel,
    '' as slack_mentions,
    true as notify_on_low_balance,
    true as notify_on_unusual_drop,
    true as notify_on_balance_recovery,
    NOW() as created_at,
    NOW() as updated_at,
    'system' as created_by
FROM partners p
WHERE p.id NOT IN (
    SELECT partner_id FROM partner_balance_configs WHERE partner_id IS NOT NULL
);

-- ==============================================
-- 3. UPDATE EXISTING CONFIGURATIONS
-- ==============================================

-- Update existing balance_monitoring_config with default values for missing fields
UPDATE balance_monitoring_config 
SET 
    working_account_threshold = COALESCE(working_account_threshold, 1000.00),
    utility_account_threshold = COALESCE(utility_account_threshold, 500.00),
    charges_account_threshold = COALESCE(charges_account_threshold, 200.00),
    check_interval_minutes = COALESCE(check_interval_minutes, 15),
    slack_channel = COALESCE(slack_channel, '#mpesa-alerts'),
    is_enabled = COALESCE(is_enabled, true),
    updated_at = NOW()
WHERE 
    working_account_threshold IS NULL 
    OR utility_account_threshold IS NULL 
    OR charges_account_threshold IS NULL 
    OR check_interval_minutes IS NULL 
    OR slack_channel IS NULL 
    OR is_enabled IS NULL;

-- Update existing partner_balance_configs with default values for missing fields
UPDATE partner_balance_configs 
SET 
    check_interval_minutes = COALESCE(check_interval_minutes, 15),
    is_monitoring_enabled = COALESCE(is_monitoring_enabled, true),
    low_balance_threshold = COALESCE(low_balance_threshold, 1000.00),
    unusual_drop_threshold = COALESCE(unusual_drop_threshold, 5000.00),
    unusual_drop_percentage = COALESCE(unusual_drop_percentage, 20.00),
    slack_channel = COALESCE(slack_channel, '#mpesa-alerts'),
    notify_on_low_balance = COALESCE(notify_on_low_balance, true),
    notify_on_unusual_drop = COALESCE(notify_on_unusual_drop, true),
    notify_on_balance_recovery = COALESCE(notify_on_balance_recovery, true),
    updated_at = NOW()
WHERE 
    check_interval_minutes IS NULL 
    OR is_monitoring_enabled IS NULL 
    OR low_balance_threshold IS NULL 
    OR unusual_drop_threshold IS NULL 
    OR unusual_drop_percentage IS NULL 
    OR slack_channel IS NULL 
    OR notify_on_low_balance IS NULL 
    OR notify_on_unusual_drop IS NULL 
    OR notify_on_balance_recovery IS NULL;

-- ==============================================
-- 4. VERIFICATION QUERIES
-- ==============================================

-- Show all partners with their configurations
SELECT 
    p.id,
    p.name,
    p.short_code,
    bmc.working_account_threshold,
    bmc.utility_account_threshold,
    bmc.charges_account_threshold,
    bmc.check_interval_minutes,
    bmc.slack_channel,
    bmc.is_enabled,
    pbc.low_balance_threshold,
    pbc.unusual_drop_threshold,
    pbc.unusual_drop_percentage,
    pbc.notify_on_low_balance,
    pbc.notify_on_unusual_drop,
    pbc.notify_on_balance_recovery
FROM partners p
LEFT JOIN balance_monitoring_config bmc ON p.id = bmc.partner_id
LEFT JOIN partner_balance_configs pbc ON p.id = pbc.partner_id
ORDER BY p.name;

-- Count configurations
SELECT 
    'balance_monitoring_config' as table_name,
    COUNT(*) as config_count
FROM balance_monitoring_config
UNION ALL
SELECT 
    'partner_balance_configs' as table_name,
    COUNT(*) as config_count
FROM partner_balance_configs
UNION ALL
SELECT 
    'partners' as table_name,
    COUNT(*) as config_count
FROM partners;
