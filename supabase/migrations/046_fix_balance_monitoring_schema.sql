-- Fix balance monitoring schema by adding missing columns to existing tables
-- This migration handles the case where tables exist but with different schemas

-- First, let's check what columns exist and add missing ones to balance_monitoring_config
DO $$ 
BEGIN
    -- Add working_account_threshold column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'working_account_threshold') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN working_account_threshold DECIMAL(15,2) NOT NULL DEFAULT 1000.00;
    END IF;
    
    -- Add utility_account_threshold column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'utility_account_threshold') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN utility_account_threshold DECIMAL(15,2) NOT NULL DEFAULT 500.00;
    END IF;
    
    -- Add charges_account_threshold column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'charges_account_threshold') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN charges_account_threshold DECIMAL(15,2) NOT NULL DEFAULT 200.00;
    END IF;
    
    -- Add check_interval_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'check_interval_minutes') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN check_interval_minutes INTEGER NOT NULL DEFAULT 30;
    END IF;
    
    -- Add slack_webhook_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'slack_webhook_url') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN slack_webhook_url TEXT;
    END IF;
    
    -- Add slack_channel column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'slack_channel') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN slack_channel VARCHAR(100) DEFAULT '#mpesa-alerts';
    END IF;
    
    -- Add is_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'is_enabled') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    -- Add last_checked_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'last_checked_at') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN last_checked_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add last_alert_sent_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'last_alert_sent_at') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN last_alert_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'created_at') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_monitoring_config' AND column_name = 'updated_at') THEN
        ALTER TABLE balance_monitoring_config ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Now let's handle the balance_alerts table
DO $$ 
BEGIN
    -- Add alert_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'alert_type') THEN
        ALTER TABLE balance_alerts ADD COLUMN alert_type VARCHAR(50) NOT NULL DEFAULT 'low_balance';
    END IF;
    
    -- Add account_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'account_type') THEN
        ALTER TABLE balance_alerts ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'working';
    END IF;
    
    -- Add current_balance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'current_balance') THEN
        ALTER TABLE balance_alerts ADD COLUMN current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00;
    END IF;
    
    -- Add threshold_balance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'threshold_balance') THEN
        ALTER TABLE balance_alerts ADD COLUMN threshold_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00;
    END IF;
    
    -- Add alert_message column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'alert_message') THEN
        ALTER TABLE balance_alerts ADD COLUMN alert_message TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Add slack_sent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'slack_sent') THEN
        ALTER TABLE balance_alerts ADD COLUMN slack_sent BOOLEAN DEFAULT false;
    END IF;
    
    -- Add slack_message_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'slack_message_id') THEN
        ALTER TABLE balance_alerts ADD COLUMN slack_message_id VARCHAR(100);
    END IF;
    
    -- Add slack_channel column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'slack_channel') THEN
        ALTER TABLE balance_alerts ADD COLUMN slack_channel VARCHAR(100);
    END IF;
    
    -- Add resolved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'resolved_at') THEN
        ALTER TABLE balance_alerts ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add resolved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'resolved_by') THEN
        ALTER TABLE balance_alerts ADD COLUMN resolved_by TEXT;
    END IF;
    
    -- Add resolution_notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'resolution_notes') THEN
        ALTER TABLE balance_alerts ADD COLUMN resolution_notes TEXT;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_alerts' AND column_name = 'created_at') THEN
        ALTER TABLE balance_alerts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for efficient querying (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_balance_monitoring_config_partner_id ON balance_monitoring_config(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_monitoring_config_enabled ON balance_monitoring_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_partner_id ON balance_alerts(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_alert_type ON balance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_created_at ON balance_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_resolved ON balance_alerts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_account_type ON balance_alerts(account_type);

-- Add unique constraint on partner_id for balance_monitoring_config if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'balance_monitoring_config' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%partner_id%'
    ) THEN
        ALTER TABLE balance_monitoring_config ADD CONSTRAINT unique_partner_id UNIQUE (partner_id);
    END IF;
END $$;

-- Insert default configurations for existing partners if they don't exist
INSERT INTO balance_monitoring_config (partner_id, working_account_threshold, utility_account_threshold, charges_account_threshold, check_interval_minutes, is_enabled)
SELECT 
    p.id,
    1000.00,
    500.00,
    200.00,
    15,
    true
FROM partners p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM balance_monitoring_config bmc WHERE bmc.partner_id = p.id
)
ON CONFLICT (partner_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE balance_monitoring_config IS 'Configuration for balance monitoring and alerts per partner';
COMMENT ON TABLE balance_alerts IS 'History of balance alerts sent to partners';
COMMENT ON COLUMN balance_monitoring_config.working_account_threshold IS 'Minimum balance threshold for working account alerts';
COMMENT ON COLUMN balance_monitoring_config.utility_account_threshold IS 'Minimum balance threshold for utility account alerts';
COMMENT ON COLUMN balance_monitoring_config.charges_account_threshold IS 'Minimum balance threshold for charges account alerts';
COMMENT ON COLUMN balance_monitoring_config.check_interval_minutes IS 'How often to check balances in minutes';
COMMENT ON COLUMN balance_alerts.alert_type IS 'Type of alert: low_balance, critical_balance, balance_check_failed';
COMMENT ON COLUMN balance_alerts.account_type IS 'Which account triggered the alert: working, utility, charges';
