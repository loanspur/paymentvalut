-- Balance Monitoring System
-- This migration adds tables for monitoring M-Pesa shortcode balances

-- Table for partner balance monitoring configurations
CREATE TABLE partner_balance_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Monitoring settings
  check_interval_minutes INTEGER NOT NULL DEFAULT 15, -- How often to check (N minutes)
  is_monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Alert thresholds
  low_balance_threshold DECIMAL(15,2) NOT NULL DEFAULT 1000.00, -- Alert when balance reaches Y amount
  unusual_drop_threshold DECIMAL(15,2) NOT NULL DEFAULT 5000.00, -- Alert when balance drops by X amount
  unusual_drop_percentage DECIMAL(5,2) DEFAULT 20.00, -- Alert when balance drops by X% (optional)
  
  -- Slack notification settings
  slack_webhook_url TEXT,
  slack_channel TEXT DEFAULT '#mpesa-alerts',
  slack_mentions TEXT, -- @user1 @user2 for mentions
  
  -- Notification preferences
  notify_on_low_balance BOOLEAN NOT NULL DEFAULT true,
  notify_on_unusual_drop BOOLEAN NOT NULL DEFAULT true,
  notify_on_balance_recovery BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- Table for balance check history
CREATE TABLE balance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  shortcode TEXT NOT NULL,
  
  -- Balance information
  balance_amount DECIMAL(15,2) NOT NULL,
  balance_currency TEXT NOT NULL DEFAULT 'KES',
  check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Comparison with previous check
  previous_balance DECIMAL(15,2),
  balance_change DECIMAL(15,2) GENERATED ALWAYS AS (balance_amount - COALESCE(previous_balance, 0)) STORED,
  balance_change_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN previous_balance > 0 THEN ((balance_amount - previous_balance) / previous_balance * 100)
      ELSE 0
    END
  ) STORED,
  
  -- Alert status
  triggered_alerts JSONB DEFAULT '[]'::jsonb, -- Array of alert types triggered
  is_alert_sent BOOLEAN DEFAULT false,
  
  -- M-Pesa response metadata
  mpesa_response JSONB, -- Full M-Pesa API response
  response_status TEXT, -- success, error, timeout
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for alert history
CREATE TABLE balance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  balance_check_id UUID NOT NULL REFERENCES balance_checks(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL, -- 'low_balance', 'unusual_drop', 'balance_recovery'
  alert_severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  
  -- Alert data
  current_balance DECIMAL(15,2) NOT NULL,
  previous_balance DECIMAL(15,2),
  threshold_value DECIMAL(15,2),
  alert_message TEXT NOT NULL,
  
  -- Notification status
  slack_sent BOOLEAN DEFAULT false,
  slack_message_id TEXT,
  slack_channel TEXT,
  
  -- Resolution tracking
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_balance_checks_partner_timestamp ON balance_checks(partner_id, check_timestamp DESC);
CREATE INDEX idx_balance_checks_shortcode_timestamp ON balance_checks(shortcode, check_timestamp DESC);
CREATE INDEX idx_balance_alerts_partner_created ON balance_alerts(partner_id, created_at DESC);
CREATE INDEX idx_balance_alerts_unresolved ON balance_alerts(is_resolved, created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_partner_balance_configs_updated_at
  BEFORE UPDATE ON partner_balance_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_configs_updated_at();

-- Insert default balance monitoring configs for existing partners
INSERT INTO partner_balance_configs (partner_id, check_interval_minutes, low_balance_threshold, unusual_drop_threshold)
SELECT 
  id,
  15, -- Check every 15 minutes
  1000.00, -- Alert when balance drops below 1000 KES
  5000.00 -- Alert when balance drops by 5000 KES
FROM partners 
WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE partner_balance_configs IS 'Configuration for balance monitoring per partner';
COMMENT ON TABLE balance_checks IS 'History of balance checks performed';
COMMENT ON TABLE balance_alerts IS 'History of balance alerts triggered';

COMMENT ON COLUMN partner_balance_configs.check_interval_minutes IS 'How often to check balance (in minutes)';
COMMENT ON COLUMN partner_balance_configs.low_balance_threshold IS 'Alert when balance reaches this amount';
COMMENT ON COLUMN partner_balance_configs.unusual_drop_threshold IS 'Alert when balance drops by this amount';
COMMENT ON COLUMN partner_balance_configs.unusual_drop_percentage IS 'Alert when balance drops by this percentage';

COMMENT ON COLUMN balance_checks.balance_change IS 'Calculated difference from previous balance';
COMMENT ON COLUMN balance_checks.balance_change_percentage IS 'Calculated percentage change from previous balance';
COMMENT ON COLUMN balance_checks.triggered_alerts IS 'JSON array of alert types that were triggered';



