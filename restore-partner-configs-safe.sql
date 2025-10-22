-- Restore Partner Configuration Settings (Safe Version)
-- This script safely restores all the configuration settings for every partner

-- ==============================================
-- 1. CREATE BALANCE MONITORING CONFIG IF NOT EXISTS
-- ==============================================

-- First, ensure the table exists with proper constraints
CREATE TABLE IF NOT EXISTS balance_monitoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    working_account_threshold DECIMAL(15,2) NOT NULL DEFAULT 1000.00,
    utility_account_threshold DECIMAL(15,2) NOT NULL DEFAULT 500.00,
    charges_account_threshold DECIMAL(15,2) NOT NULL DEFAULT 200.00,
    check_interval_minutes INTEGER NOT NULL DEFAULT 30,
    slack_webhook_url TEXT,
    slack_channel VARCHAR(100),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_alert_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id)
);

-- ==============================================
-- 2. CREATE PARTNER BALANCE CONFIGS IF NOT EXISTS
-- ==============================================

CREATE TABLE IF NOT EXISTS partner_balance_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    check_interval_minutes INTEGER NOT NULL DEFAULT 15,
    is_monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
    low_balance_threshold DECIMAL(15,2) NOT NULL DEFAULT 1000.00,
    unusual_drop_threshold DECIMAL(15,2) NOT NULL DEFAULT 5000.00,
    unusual_drop_percentage DECIMAL(5,2) DEFAULT 20.00,
    slack_webhook_url TEXT,
    slack_channel TEXT DEFAULT '#mpesa-alerts',
    slack_mentions TEXT,
    notify_on_low_balance BOOLEAN NOT NULL DEFAULT true,
    notify_on_unusual_drop BOOLEAN NOT NULL DEFAULT true,
    notify_on_balance_recovery BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT DEFAULT 'system',
    UNIQUE(partner_id)
);

-- ==============================================
-- 3. INSERT CONFIGURATIONS FOR MISSING PARTNERS
-- ==============================================

-- Insert into balance_monitoring_config for missing partners
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
    p.id,
    1000.00,
    500.00,
    200.00,
    15,
    '',
    '#mpesa-alerts',
    true,
    NULL,
    NOW(),
    NOW()
FROM partners p
WHERE NOT EXISTS (
    SELECT 1 FROM balance_monitoring_config bmc WHERE bmc.partner_id = p.id
);

-- Insert into partner_balance_configs for missing partners
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
    p.id,
    15,
    true,
    1000.00,
    5000.00,
    20.00,
    '',
    '#mpesa-alerts',
    '',
    true,
    true,
    true,
    NOW(),
    NOW(),
    'system'
FROM partners p
WHERE NOT EXISTS (
    SELECT 1 FROM partner_balance_configs pbc WHERE pbc.partner_id = p.id
);

-- ==============================================
-- 4. UPDATE EXISTING CONFIGURATIONS WITH DEFAULTS
-- ==============================================

-- Update balance_monitoring_config with defaults for NULL values
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

-- Update partner_balance_configs with defaults for NULL values
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
-- 5. VERIFICATION
-- ==============================================

-- Show summary of configurations
SELECT 
    'Partners Total' as description,
    COUNT(*) as count
FROM partners
UNION ALL
SELECT 
    'Balance Monitoring Configs' as description,
    COUNT(*) as count
FROM balance_monitoring_config
UNION ALL
SELECT 
    'Partner Balance Configs' as description,
    COUNT(*) as count
FROM partner_balance_configs;

-- Show all partners with their configurations
SELECT 
    p.id,
    p.name,
    p.short_code,
    CASE WHEN bmc.partner_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_balance_monitoring_config,
    CASE WHEN pbc.partner_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_partner_balance_config
FROM partners p
LEFT JOIN balance_monitoring_config bmc ON p.id = bmc.partner_id
LEFT JOIN partner_balance_configs pbc ON p.id = pbc.partner_id
ORDER BY p.name;

