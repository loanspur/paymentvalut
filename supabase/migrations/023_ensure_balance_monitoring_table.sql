-- Ensure balance monitoring table exists with correct schema
-- This migration creates the balance_monitoring_config table if it doesn't exist

-- Create balance_monitoring_config table if it doesn't exist
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

-- Create balance_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS balance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'low_balance', 'critical_balance', 'balance_check_failed'
    account_type VARCHAR(20) NOT NULL, -- 'working', 'utility', 'charges'
    current_balance DECIMAL(15,2) NOT NULL,
    threshold_balance DECIMAL(15,2) NOT NULL,
    alert_message TEXT NOT NULL,
    slack_sent BOOLEAN DEFAULT false,
    slack_message_id VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_balance_monitoring_config_partner_id ON balance_monitoring_config(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_monitoring_config_enabled ON balance_monitoring_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_partner_id ON balance_alerts(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_alert_type ON balance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_created_at ON balance_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_resolved ON balance_alerts(resolved_at);

-- Add comments
COMMENT ON TABLE balance_monitoring_config IS 'Configuration for balance monitoring and alerts per partner';
COMMENT ON TABLE balance_alerts IS 'History of balance alerts sent to partners';
COMMENT ON COLUMN balance_monitoring_config.working_account_threshold IS 'Minimum balance threshold for working account alerts';
COMMENT ON COLUMN balance_monitoring_config.utility_account_threshold IS 'Minimum balance threshold for utility account alerts';
COMMENT ON COLUMN balance_monitoring_config.charges_account_threshold IS 'Minimum balance threshold for charges account alerts';
COMMENT ON COLUMN balance_monitoring_config.check_interval_minutes IS 'How often to check balances in minutes';
COMMENT ON COLUMN balance_alerts.alert_type IS 'Type of alert: low_balance, critical_balance, balance_check_failed';
COMMENT ON COLUMN balance_alerts.account_type IS 'Which account triggered the alert';

