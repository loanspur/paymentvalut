-- Fix Balance Monitoring Missing Columns
-- This migration adds all missing columns needed for the balance monitoring system

-- ==============================================
-- 1. Add variance_drop_threshold to balance_monitoring_config
-- ==============================================
DO $$ 
BEGIN
    -- Add variance_drop_threshold column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_monitoring_config' 
        AND column_name = 'variance_drop_threshold'
    ) THEN
        -- Add the column as nullable first
        ALTER TABLE balance_monitoring_config 
        ADD COLUMN variance_drop_threshold DECIMAL(15,2);
        
        -- Add a comment to explain the column
        COMMENT ON COLUMN balance_monitoring_config.variance_drop_threshold IS 'KES amount threshold for variance drop alerts (e.g., 5000.00 = 5000 KES drop)';
        
        RAISE NOTICE 'Added variance_drop_threshold column to balance_monitoring_config';
    ELSE
        RAISE NOTICE 'variance_drop_threshold column already exists in balance_monitoring_config';
    END IF;
END $$;

-- Set default value for existing records
UPDATE balance_monitoring_config 
SET variance_drop_threshold = 5000.00 
WHERE variance_drop_threshold IS NULL;

-- Add check constraint for minimum value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.constraint_name = 'chk_variance_drop_threshold_min'
        AND tc.table_name = 'balance_monitoring_config'
    ) THEN
        ALTER TABLE balance_monitoring_config 
        ADD CONSTRAINT chk_variance_drop_threshold_min 
        CHECK (variance_drop_threshold >= 1.00);
        
        RAISE NOTICE 'Added check constraint for variance_drop_threshold minimum value';
    ELSE
        RAISE NOTICE 'Check constraint for variance_drop_threshold already exists';
    END IF;
END $$;

-- Set default value for the column
ALTER TABLE balance_monitoring_config 
ALTER COLUMN variance_drop_threshold SET DEFAULT 5000.00;

-- ==============================================
-- 2. Add missing columns to balance_alerts table
-- ==============================================

-- Add threshold_balance column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_alerts' 
        AND column_name = 'threshold_balance'
    ) THEN
        ALTER TABLE balance_alerts 
        ADD COLUMN threshold_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_alerts.threshold_balance IS 'Threshold value that triggered the alert';
        
        RAISE NOTICE 'Added threshold_balance column to balance_alerts';
    ELSE
        RAISE NOTICE 'threshold_balance column already exists in balance_alerts';
    END IF;
END $$;

-- Add previous_balance column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_alerts' 
        AND column_name = 'previous_balance'
    ) THEN
        ALTER TABLE balance_alerts 
        ADD COLUMN previous_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_alerts.previous_balance IS 'Previous balance value for comparison';
        
        RAISE NOTICE 'Added previous_balance column to balance_alerts';
    ELSE
        RAISE NOTICE 'previous_balance column already exists in balance_alerts';
    END IF;
END $$;

-- Add alert_severity column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_alerts' 
        AND column_name = 'alert_severity'
    ) THEN
        ALTER TABLE balance_alerts 
        ADD COLUMN alert_severity VARCHAR(20) DEFAULT 'warning';
        
        COMMENT ON COLUMN balance_alerts.alert_severity IS 'Severity level: info, warning, critical';
        
        RAISE NOTICE 'Added alert_severity column to balance_alerts';
    ELSE
        RAISE NOTICE 'alert_severity column already exists in balance_alerts';
    END IF;
END $$;

-- Add is_resolved column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_alerts' 
        AND column_name = 'is_resolved'
    ) THEN
        ALTER TABLE balance_alerts 
        ADD COLUMN is_resolved BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN balance_alerts.is_resolved IS 'Whether the alert has been resolved';
        
        RAISE NOTICE 'Added is_resolved column to balance_alerts';
    ELSE
        RAISE NOTICE 'is_resolved column already exists in balance_alerts';
    END IF;
END $$;

-- Add resolved_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_alerts' 
        AND column_name = 'resolved_by'
    ) THEN
        ALTER TABLE balance_alerts 
        ADD COLUMN resolved_by TEXT;
        
        COMMENT ON COLUMN balance_alerts.resolved_by IS 'Who resolved the alert';
        
        RAISE NOTICE 'Added resolved_by column to balance_alerts';
    ELSE
        RAISE NOTICE 'resolved_by column already exists in balance_alerts';
    END IF;
END $$;

-- Add resolution_notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_alerts' 
        AND column_name = 'resolution_notes'
    ) THEN
        ALTER TABLE balance_alerts 
        ADD COLUMN resolution_notes TEXT;
        
        COMMENT ON COLUMN balance_alerts.resolution_notes IS 'Notes about how the alert was resolved';
        
        RAISE NOTICE 'Added resolution_notes column to balance_alerts';
    ELSE
        RAISE NOTICE 'resolution_notes column already exists in balance_alerts';
    END IF;
END $$;

-- Add slack_channel column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_alerts' 
        AND column_name = 'slack_channel'
    ) THEN
        ALTER TABLE balance_alerts 
        ADD COLUMN slack_channel VARCHAR(100);
        
        COMMENT ON COLUMN balance_alerts.slack_channel IS 'Slack channel where the alert was sent';
        
        RAISE NOTICE 'Added slack_channel column to balance_alerts';
    ELSE
        RAISE NOTICE 'slack_channel column already exists in balance_alerts';
    END IF;
END $$;

-- ==============================================
-- 3. Add missing columns to balance_checks table
-- ==============================================

-- Add previous_balance column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_checks' 
        AND column_name = 'previous_balance'
    ) THEN
        ALTER TABLE balance_checks 
        ADD COLUMN previous_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_checks.previous_balance IS 'Previous balance for comparison';
        
        RAISE NOTICE 'Added previous_balance column to balance_checks';
    ELSE
        RAISE NOTICE 'previous_balance column already exists in balance_checks';
    END IF;
END $$;

-- Add triggered_alerts column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_checks' 
        AND column_name = 'triggered_alerts'
    ) THEN
        ALTER TABLE balance_checks 
        ADD COLUMN triggered_alerts JSONB DEFAULT '[]'::jsonb;
        
        COMMENT ON COLUMN balance_checks.triggered_alerts IS 'JSON array of alert types that were triggered';
        
        RAISE NOTICE 'Added triggered_alerts column to balance_checks';
    ELSE
        RAISE NOTICE 'triggered_alerts column already exists in balance_checks';
    END IF;
END $$;

-- Add is_alert_sent column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_checks' 
        AND column_name = 'is_alert_sent'
    ) THEN
        ALTER TABLE balance_checks 
        ADD COLUMN is_alert_sent BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN balance_checks.is_alert_sent IS 'Whether alerts were sent for this check';
        
        RAISE NOTICE 'Added is_alert_sent column to balance_checks';
    ELSE
        RAISE NOTICE 'is_alert_sent column already exists in balance_checks';
    END IF;
END $$;

-- Add mpesa_response column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_checks' 
        AND column_name = 'mpesa_response'
    ) THEN
        ALTER TABLE balance_checks 
        ADD COLUMN mpesa_response JSONB;
        
        COMMENT ON COLUMN balance_checks.mpesa_response IS 'Full M-Pesa API response';
        
        RAISE NOTICE 'Added mpesa_response column to balance_checks';
    ELSE
        RAISE NOTICE 'mpesa_response column already exists in balance_checks';
    END IF;
END $$;

-- Add response_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_checks' 
        AND column_name = 'response_status'
    ) THEN
        ALTER TABLE balance_checks 
        ADD COLUMN response_status TEXT;
        
        COMMENT ON COLUMN balance_checks.response_status IS 'Status of the M-Pesa API response: success, error, timeout';
        
        RAISE NOTICE 'Added response_status column to balance_checks';
    ELSE
        RAISE NOTICE 'response_status column already exists in balance_checks';
    END IF;
END $$;

-- Add error_message column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_checks' 
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE balance_checks 
        ADD COLUMN error_message TEXT;
        
        COMMENT ON COLUMN balance_checks.error_message IS 'Error message if the balance check failed';
        
        RAISE NOTICE 'Added error_message column to balance_checks';
    ELSE
        RAISE NOTICE 'error_message column already exists in balance_checks';
    END IF;
END $$;

-- ==============================================
-- 4. Add missing columns to balance_requests table
-- ==============================================

-- Add balance_before column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'balance_before'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN balance_before DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.balance_before IS 'Balance before the transaction';
        
        RAISE NOTICE 'Added balance_before column to balance_requests';
    ELSE
        RAISE NOTICE 'balance_before column already exists in balance_requests';
    END IF;
END $$;

-- Add balance_after column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'balance_after'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN balance_after DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.balance_after IS 'Balance after the transaction';
        
        RAISE NOTICE 'Added balance_after column to balance_requests';
    ELSE
        RAISE NOTICE 'balance_after column already exists in balance_requests';
    END IF;
END $$;

-- Add utility_account_balance column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'utility_account_balance'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN utility_account_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.utility_account_balance IS 'Utility account balance from M-Pesa callback';
        
        RAISE NOTICE 'Added utility_account_balance column to balance_requests';
    ELSE
        RAISE NOTICE 'utility_account_balance column already exists in balance_requests';
    END IF;
END $$;

-- Add working_account_balance column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'working_account_balance'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN working_account_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.working_account_balance IS 'Working account balance from M-Pesa callback';
        
        RAISE NOTICE 'Added working_account_balance column to balance_requests';
    ELSE
        RAISE NOTICE 'working_account_balance column already exists in balance_requests';
    END IF;
END $$;

-- Add charges_account_balance column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'charges_account_balance'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN charges_account_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.charges_account_balance IS 'Charges account balance from M-Pesa callback';
        
        RAISE NOTICE 'Added charges_account_balance column to balance_requests';
    ELSE
        RAISE NOTICE 'charges_account_balance column already exists in balance_requests';
    END IF;
END $$;

-- Add mpesa_response column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'mpesa_response'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN mpesa_response JSONB;
        
        COMMENT ON COLUMN balance_requests.mpesa_response IS 'Full M-Pesa API response';
        
        RAISE NOTICE 'Added mpesa_response column to balance_requests';
    ELSE
        RAISE NOTICE 'mpesa_response column already exists in balance_requests';
    END IF;
END $$;

-- Add callback_received_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'callback_received_at'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN callback_received_at TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN balance_requests.callback_received_at IS 'When the M-Pesa callback was received';
        
        RAISE NOTICE 'Added callback_received_at column to balance_requests';
    ELSE
        RAISE NOTICE 'callback_received_at column already exists in balance_requests';
    END IF;
END $$;

-- ==============================================
-- 5. Add missing columns to disbursement_requests table
-- ==============================================

-- Add balance_updated_at_transaction column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'balance_updated_at_transaction'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN balance_updated_at_transaction TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN disbursement_requests.balance_updated_at_transaction IS 'When the balance was last updated for this transaction';
        
        RAISE NOTICE 'Added balance_updated_at_transaction column to disbursement_requests';
    ELSE
        RAISE NOTICE 'balance_updated_at_transaction column already exists in disbursement_requests';
    END IF;
END $$;

-- ==============================================
-- 6. Final verification
-- ==============================================

-- Show summary of all balance monitoring tables and their columns
SELECT 
    'Table Schema Summary' as info,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN (
    'balance_monitoring_config',
    'balance_alerts', 
    'balance_checks',
    'balance_requests',
    'disbursement_requests'
)
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
