-- Simple Balance Monitoring Column Fix
-- This migration adds missing columns without complex constraint checking

-- ==============================================
-- 1. Add variance_drop_threshold to balance_monitoring_config
-- ==============================================
ALTER TABLE balance_monitoring_config 
ADD COLUMN IF NOT EXISTS variance_drop_threshold DECIMAL(15,2) DEFAULT 5000.00;

-- Set default value for existing records
UPDATE balance_monitoring_config 
SET variance_drop_threshold = 5000.00 
WHERE variance_drop_threshold IS NULL;

-- Add comment
COMMENT ON COLUMN balance_monitoring_config.variance_drop_threshold IS 'KES amount threshold for variance drop alerts (e.g., 5000.00 = 5000 KES drop)';

-- ==============================================
-- 2. Add missing columns to balance_alerts table
-- ==============================================

ALTER TABLE balance_alerts 
ADD COLUMN IF NOT EXISTS threshold_balance DECIMAL(15,2);

ALTER TABLE balance_alerts 
ADD COLUMN IF NOT EXISTS previous_balance DECIMAL(15,2);

ALTER TABLE balance_alerts 
ADD COLUMN IF NOT EXISTS alert_severity VARCHAR(20) DEFAULT 'warning';

ALTER TABLE balance_alerts 
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;

ALTER TABLE balance_alerts 
ADD COLUMN IF NOT EXISTS resolved_by TEXT;

ALTER TABLE balance_alerts 
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

ALTER TABLE balance_alerts 
ADD COLUMN IF NOT EXISTS slack_channel VARCHAR(100);

-- Add comments
COMMENT ON COLUMN balance_alerts.threshold_balance IS 'Threshold value that triggered the alert';
COMMENT ON COLUMN balance_alerts.previous_balance IS 'Previous balance for comparison';
COMMENT ON COLUMN balance_alerts.alert_severity IS 'Severity level: info, warning, critical';
COMMENT ON COLUMN balance_alerts.is_resolved IS 'Whether the alert has been resolved';
COMMENT ON COLUMN balance_alerts.resolved_by IS 'Who resolved the alert';
COMMENT ON COLUMN balance_alerts.resolution_notes IS 'Notes about how the alert was resolved';
COMMENT ON COLUMN balance_alerts.slack_channel IS 'Slack channel where the alert was sent';

-- ==============================================
-- 3. Add missing columns to balance_checks table
-- ==============================================

ALTER TABLE balance_checks 
ADD COLUMN IF NOT EXISTS previous_balance DECIMAL(15,2);

ALTER TABLE balance_checks 
ADD COLUMN IF NOT EXISTS triggered_alerts JSONB DEFAULT '[]'::jsonb;

ALTER TABLE balance_checks 
ADD COLUMN IF NOT EXISTS is_alert_sent BOOLEAN DEFAULT false;

ALTER TABLE balance_checks 
ADD COLUMN IF NOT EXISTS mpesa_response JSONB;

ALTER TABLE balance_checks 
ADD COLUMN IF NOT EXISTS response_status TEXT;

ALTER TABLE balance_checks 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add comments
COMMENT ON COLUMN balance_checks.previous_balance IS 'Previous balance for comparison';
COMMENT ON COLUMN balance_checks.triggered_alerts IS 'JSON array of alert types that were triggered';
COMMENT ON COLUMN balance_checks.is_alert_sent IS 'Whether alerts were sent for this check';
COMMENT ON COLUMN balance_checks.mpesa_response IS 'Full M-Pesa API response';
COMMENT ON COLUMN balance_checks.response_status IS 'Status of the M-Pesa API response: success, error, timeout';
COMMENT ON COLUMN balance_checks.error_message IS 'Error message if the balance check failed';

-- ==============================================
-- 4. Add missing columns to balance_requests table
-- ==============================================

ALTER TABLE balance_requests 
ADD COLUMN IF NOT EXISTS balance_before DECIMAL(15,2);

ALTER TABLE balance_requests 
ADD COLUMN IF NOT EXISTS balance_after DECIMAL(15,2);

ALTER TABLE balance_requests 
ADD COLUMN IF NOT EXISTS utility_account_balance DECIMAL(15,2);

ALTER TABLE balance_requests 
ADD COLUMN IF NOT EXISTS working_account_balance DECIMAL(15,2);

ALTER TABLE balance_requests 
ADD COLUMN IF NOT EXISTS charges_account_balance DECIMAL(15,2);

ALTER TABLE balance_requests 
ADD COLUMN IF NOT EXISTS mpesa_response JSONB;

ALTER TABLE balance_requests 
ADD COLUMN IF NOT EXISTS callback_received_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN balance_requests.balance_before IS 'Balance before the transaction';
COMMENT ON COLUMN balance_requests.balance_after IS 'Balance after the transaction';
COMMENT ON COLUMN balance_requests.utility_account_balance IS 'Utility account balance from M-Pesa callback';
COMMENT ON COLUMN balance_requests.working_account_balance IS 'Working account balance from M-Pesa callback';
COMMENT ON COLUMN balance_requests.charges_account_balance IS 'Charges account balance from M-Pesa callback';
COMMENT ON COLUMN balance_requests.mpesa_response IS 'Full M-Pesa API response';
COMMENT ON COLUMN balance_requests.callback_received_at IS 'When the M-Pesa callback was received';

-- ==============================================
-- 5. Add missing columns to disbursement_requests table
-- ==============================================

ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS balance_updated_at_transaction TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN disbursement_requests.balance_updated_at_transaction IS 'When the balance was last updated for this transaction';

-- ==============================================
-- 6. Verification - Show what we have now
-- ==============================================

SELECT 
    'Migration Complete' as status,
    'All balance monitoring columns have been added successfully' as message;

-- Show summary of balance_monitoring_config columns
SELECT 
    'balance_monitoring_config columns' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'balance_monitoring_config'
AND table_schema = 'public'
ORDER BY ordinal_position;
