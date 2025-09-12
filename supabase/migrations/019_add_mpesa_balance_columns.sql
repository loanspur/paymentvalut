-- Add M-Pesa balance columns to disbursement_requests table
-- This will track account balances before and after each transaction

ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS mpesa_balance_before DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS mpesa_balance_after DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS mpesa_working_account_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS mpesa_utility_account_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS mpesa_charges_account_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS balance_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for balance queries
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_balance_updated_at 
ON disbursement_requests(balance_updated_at);

-- Add comment explaining the balance columns
COMMENT ON COLUMN disbursement_requests.mpesa_balance_before IS 'M-Pesa account balance before transaction';
COMMENT ON COLUMN disbursement_requests.mpesa_balance_after IS 'M-Pesa account balance after transaction';
COMMENT ON COLUMN disbursement_requests.mpesa_working_account_balance IS 'M-Pesa working account balance from callback';
COMMENT ON COLUMN disbursement_requests.mpesa_utility_account_balance IS 'M-Pesa utility account balance from callback';
COMMENT ON COLUMN disbursement_requests.mpesa_charges_account_balance IS 'M-Pesa charges account balance from callback';
COMMENT ON COLUMN disbursement_requests.balance_updated_at IS 'Timestamp when balance was last updated';


