-- Add missing balance columns to disbursement_requests table
-- This allows storing utility balance information from M-Pesa callbacks

ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS utility_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS working_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS charges_balance_at_transaction DECIMAL(15,2);

-- Add comments for documentation
COMMENT ON COLUMN disbursement_requests.utility_balance_at_transaction IS 'Utility account balance at the time of transaction from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.working_balance_at_transaction IS 'Working account balance at the time of transaction from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.charges_balance_at_transaction IS 'Charges account balance at the time of transaction from M-Pesa callback';
