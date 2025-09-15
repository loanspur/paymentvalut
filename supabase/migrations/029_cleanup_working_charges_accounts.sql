-- Clean up working and charges account references
-- This migration removes working and charges account data and columns

-- Delete existing balance history entries for working and charges accounts
DELETE FROM mpesa_balance_history 
WHERE balance_type IN ('working', 'charges');

-- Delete existing balance alerts for working and charges accounts
DELETE FROM balance_alerts 
WHERE account_type IN ('working', 'charges');

-- Remove working and charges account columns from disbursement_requests
ALTER TABLE disbursement_requests 
DROP COLUMN IF EXISTS mpesa_working_account_balance,
DROP COLUMN IF EXISTS mpesa_charges_account_balance;

-- Remove working and charges account columns from balance_monitoring_config
ALTER TABLE balance_monitoring_config 
DROP COLUMN IF EXISTS working_account_threshold,
DROP COLUMN IF EXISTS charges_account_threshold;

-- Update balance_alerts table to only allow utility account type
ALTER TABLE balance_alerts 
DROP CONSTRAINT IF EXISTS balance_alerts_account_type_check;

ALTER TABLE balance_alerts 
ADD CONSTRAINT balance_alerts_account_type_check 
CHECK (account_type = 'utility');

-- Update mpesa_balance_history table to only allow utility balance type
ALTER TABLE mpesa_balance_history 
DROP CONSTRAINT IF EXISTS mpesa_balance_history_balance_type_check;

ALTER TABLE mpesa_balance_history 
ADD CONSTRAINT mpesa_balance_history_balance_type_check 
CHECK (balance_type = 'utility');

-- Add comments
COMMENT ON COLUMN disbursement_requests.mpesa_utility_account_balance IS 'M-Pesa utility account balance from callback';
COMMENT ON COLUMN balance_monitoring_config.utility_account_threshold IS 'Threshold for utility account balance alerts';
COMMENT ON COLUMN balance_alerts.account_type IS 'Account type: utility only';
COMMENT ON COLUMN mpesa_balance_history.balance_type IS 'Balance type: utility only';






