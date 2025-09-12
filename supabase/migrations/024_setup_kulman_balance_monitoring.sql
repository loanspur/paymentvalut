-- Setup Kulman Group Limited for balance monitoring with proper credentials
-- This migration sets up balance monitoring configuration and updates credentials

-- First, let's check what credentials Kulman currently has
-- Update Kulman Group Limited with proper M-Pesa credentials (replace with actual values)
UPDATE partners 
SET 
    mpesa_shortcode = '174379',  -- M-Pesa B2C shortcode
    mpesa_consumer_key = 'YOUR_ACTUAL_CONSUMER_KEY',  -- Replace with actual consumer key from Safaricom
    mpesa_consumer_secret = 'YOUR_ACTUAL_CONSUMER_SECRET',  -- Replace with actual consumer secret from Safaricom
    mpesa_passkey = 'YOUR_ACTUAL_PASSKEY',  -- Replace with actual passkey from Safaricom
    mpesa_initiator_name = 'YOUR_ACTUAL_INITIATOR_NAME',  -- Replace with actual initiator name from Safaricom
    mpesa_initiator_password = 'YOUR_ACTUAL_INITIATOR_PASSWORD',  -- Replace with actual initiator password from Safaricom
    mpesa_environment = 'sandbox',  -- Use sandbox for testing, change to 'production' for live
    is_mpesa_configured = true,
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000' 
AND name = 'Kulman Group Limited';

-- Create balance monitoring configuration for Kulman Group Limited
-- Using partner_balance_configs table (since balance_monitoring_config might not exist)
-- First, delete any existing configuration for this partner
DELETE FROM partner_balance_configs WHERE partner_id = '550e8400-e29b-41d4-a716-446655440000';

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
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',  -- Kulman Group Limited ID
    15,  -- Check every 15 minutes
    true,  -- Enable monitoring
    1000.00,  -- Alert when balance drops below KES 1,000
    5000.00,  -- Alert when balance drops by KES 5,000
    20.00,  -- Alert when balance drops by 20%
    NULL,  -- Slack webhook URL (set this if you want Slack notifications)
    '#mpesa-alerts',  -- Slack channel
    '@admin @finance',  -- Users to mention in alerts
    true,  -- Notify on low balance
    true,  -- Notify on unusual drop
    true,  -- Notify on balance recovery
    NOW(),
    NOW(),
    'system'
);

-- Also try to create in balance_monitoring_config table if it exists
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
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',  -- Kulman Group Limited ID
    1000.00,  -- Working account threshold
    500.00,   -- Utility account threshold
    200.00,   -- Charges account threshold
    15,       -- Check every 15 minutes
    NULL,     -- Slack webhook URL
    '#mpesa-alerts',  -- Slack channel
    true,     -- Enable monitoring
    NOW(),
    NOW()
) ON CONFLICT (partner_id) DO UPDATE SET
    working_account_threshold = EXCLUDED.working_account_threshold,
    utility_account_threshold = EXCLUDED.utility_account_threshold,
    charges_account_threshold = EXCLUDED.charges_account_threshold,
    check_interval_minutes = EXCLUDED.check_interval_minutes,
    slack_webhook_url = EXCLUDED.slack_webhook_url,
    slack_channel = EXCLUDED.slack_channel,
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW();

-- Add comments
COMMENT ON TABLE partner_balance_configs IS 'Balance monitoring configuration for partners using legacy schema';
COMMENT ON TABLE balance_monitoring_config IS 'Balance monitoring configuration for partners using new schema';
