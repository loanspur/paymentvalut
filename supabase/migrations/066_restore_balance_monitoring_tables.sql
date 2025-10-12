-- Restore Real-Time Balance Monitoring Tables for Partners
-- This migration ensures all balance monitoring tables exist with correct schemas
-- and proper relationships

-- ==============================================
-- 1. PARTNER BALANCE CONFIGS (Legacy Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS partner_balance_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Monitoring settings
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  is_monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Alert thresholds
  low_balance_threshold DECIMAL(15,2) NOT NULL DEFAULT 1000.00,
  unusual_drop_threshold DECIMAL(15,2) NOT NULL DEFAULT 5000.00,
  unusual_drop_percentage DECIMAL(5,2) DEFAULT 20.00,
  
  -- Slack notification settings
  slack_webhook_url TEXT,
  slack_channel TEXT DEFAULT '#mpesa-alerts',
  slack_mentions TEXT,
  
  -- Notification preferences
  notify_on_low_balance BOOLEAN NOT NULL DEFAULT true,
  notify_on_unusual_drop BOOLEAN NOT NULL DEFAULT true,
  notify_on_balance_recovery BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- ==============================================
-- 2. BALANCE CHECKS (History Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS balance_checks (
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
  triggered_alerts JSONB DEFAULT '[]'::jsonb,
  is_alert_sent BOOLEAN DEFAULT false,
  
  -- M-Pesa response metadata
  mpesa_response JSONB,
  response_status TEXT,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. BALANCE MONITORING CONFIG (Newer Table)
-- ==============================================
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
-- 4. BALANCE ALERTS (Alert History)
-- ==============================================
CREATE TABLE IF NOT EXISTS balance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    balance_check_id UUID REFERENCES balance_checks(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'low_balance', 'critical_balance', 'balance_check_failed', 'unusual_drop', 'balance_recovery'
    alert_severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
    account_type VARCHAR(20) NOT NULL DEFAULT 'working', -- 'working', 'utility', 'charges'
    
    -- Alert data
    current_balance DECIMAL(15,2) NOT NULL,
    previous_balance DECIMAL(15,2),
    threshold_balance DECIMAL(15,2) NOT NULL,
    alert_message TEXT NOT NULL,
    
    -- Notification status
    slack_sent BOOLEAN DEFAULT false,
    slack_message_id VARCHAR(100),
    slack_channel VARCHAR(100),
    
    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 5. BALANCE REQUESTS (M-Pesa Balance Inquiries)
-- ==============================================
CREATE TABLE IF NOT EXISTS balance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL UNIQUE,
    originator_conversation_id TEXT,
    transaction_id TEXT,
    
    -- Request details
    request_type VARCHAR(50) NOT NULL DEFAULT 'balance_inquiry',
    shortcode TEXT NOT NULL,
    initiator_name TEXT NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'timeout')),
    result_code TEXT,
    result_desc TEXT,
    
    -- Balance information (populated by callback)
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    utility_account_balance DECIMAL(15,2),
    working_account_balance DECIMAL(15,2),
    charges_account_balance DECIMAL(15,2),
    
    -- M-Pesa API details
    mpesa_response JSONB,
    callback_received_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 6. INDEXES FOR PERFORMANCE
-- ==============================================

-- Partner balance configs indexes
CREATE INDEX IF NOT EXISTS idx_partner_balance_configs_partner_id ON partner_balance_configs(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_balance_configs_enabled ON partner_balance_configs(is_monitoring_enabled);

-- Balance checks indexes
CREATE INDEX IF NOT EXISTS idx_balance_checks_partner_timestamp ON balance_checks(partner_id, check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_balance_checks_shortcode_timestamp ON balance_checks(shortcode, check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_balance_checks_created_at ON balance_checks(created_at);

-- Balance monitoring config indexes
CREATE INDEX IF NOT EXISTS idx_balance_monitoring_config_partner_id ON balance_monitoring_config(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_monitoring_config_enabled ON balance_monitoring_config(is_enabled);

-- Balance alerts indexes
CREATE INDEX IF NOT EXISTS idx_balance_alerts_partner_id ON balance_alerts(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_alert_type ON balance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_created_at ON balance_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_resolved ON balance_alerts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_account_type ON balance_alerts(account_type);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_partner_created ON balance_alerts(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_unresolved ON balance_alerts(is_resolved, created_at DESC);

-- Balance requests indexes
CREATE INDEX IF NOT EXISTS idx_balance_requests_partner_id ON balance_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_requests_conversation_id ON balance_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_balance_requests_status ON balance_requests(status);
CREATE INDEX IF NOT EXISTS idx_balance_requests_created_at ON balance_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_requests_partner_created ON balance_requests(partner_id, created_at);

-- ==============================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for partner_balance_configs
DROP TRIGGER IF EXISTS update_partner_balance_configs_updated_at ON partner_balance_configs;
CREATE TRIGGER update_partner_balance_configs_updated_at
  BEFORE UPDATE ON partner_balance_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_configs_updated_at();

-- Trigger for balance_monitoring_config
DROP TRIGGER IF EXISTS update_balance_monitoring_config_updated_at ON balance_monitoring_config;
CREATE TRIGGER update_balance_monitoring_config_updated_at
  BEFORE UPDATE ON balance_monitoring_config
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_configs_updated_at();

-- Trigger for balance_requests
DROP TRIGGER IF EXISTS update_balance_requests_updated_at ON balance_requests;
CREATE TRIGGER update_balance_requests_updated_at
  BEFORE UPDATE ON balance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_configs_updated_at();

-- ==============================================
-- 8. INSERT DEFAULT CONFIGURATIONS
-- ==============================================

-- Insert default configurations for existing partners in balance_monitoring_config
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

-- Insert default configurations for existing partners in partner_balance_configs (legacy)
INSERT INTO partner_balance_configs (partner_id, check_interval_minutes, low_balance_threshold, unusual_drop_threshold)
SELECT 
  p.id,
  15,
  1000.00,
  5000.00
FROM partners p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM partner_balance_configs pbc WHERE pbc.partner_id = p.id
)
ON CONFLICT DO NOTHING;

-- ==============================================
-- 9. TABLE COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE partner_balance_configs IS 'Legacy configuration for balance monitoring per partner';
COMMENT ON TABLE balance_checks IS 'History of balance checks performed for all partners';
COMMENT ON TABLE balance_monitoring_config IS 'Current configuration for balance monitoring and alerts per partner';
COMMENT ON TABLE balance_alerts IS 'History of balance alerts sent to partners';
COMMENT ON TABLE balance_requests IS 'Tracks M-Pesa balance inquiry requests and their results';

-- Column comments for partner_balance_configs
COMMENT ON COLUMN partner_balance_configs.check_interval_minutes IS 'How often to check balance (in minutes)';
COMMENT ON COLUMN partner_balance_configs.low_balance_threshold IS 'Alert when balance reaches this amount';
COMMENT ON COLUMN partner_balance_configs.unusual_drop_threshold IS 'Alert when balance drops by this amount';
COMMENT ON COLUMN partner_balance_configs.unusual_drop_percentage IS 'Alert when balance drops by this percentage';

-- Column comments for balance_checks
COMMENT ON COLUMN balance_checks.balance_change IS 'Calculated difference from previous balance';
COMMENT ON COLUMN balance_checks.balance_change_percentage IS 'Calculated percentage change from previous balance';
COMMENT ON COLUMN balance_checks.triggered_alerts IS 'JSON array of alert types that were triggered';

-- Column comments for balance_monitoring_config
COMMENT ON COLUMN balance_monitoring_config.working_account_threshold IS 'Minimum balance threshold for working account alerts';
COMMENT ON COLUMN balance_monitoring_config.utility_account_threshold IS 'Minimum balance threshold for utility account alerts';
COMMENT ON COLUMN balance_monitoring_config.charges_account_threshold IS 'Minimum balance threshold for charges account alerts';
COMMENT ON COLUMN balance_monitoring_config.check_interval_minutes IS 'How often to check balances in minutes';

-- Column comments for balance_alerts
COMMENT ON COLUMN balance_alerts.alert_type IS 'Type of alert: low_balance, critical_balance, balance_check_failed, unusual_drop, balance_recovery';
COMMENT ON COLUMN balance_alerts.account_type IS 'Which account triggered the alert: working, utility, charges';
COMMENT ON COLUMN balance_alerts.alert_severity IS 'Severity level: info, warning, critical';

-- Column comments for balance_requests
COMMENT ON COLUMN balance_requests.conversation_id IS 'M-Pesa conversation ID for tracking the request';
COMMENT ON COLUMN balance_requests.request_type IS 'Type of balance request: balance_inquiry, account_balance';
COMMENT ON COLUMN balance_requests.status IS 'Request status: pending, completed, failed, timeout';
