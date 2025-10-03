-- Add missing balance columns to disbursement_requests table if they don't exist
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS utility_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS working_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS charges_balance_at_transaction DECIMAL(15,2);

-- Add comments for documentation
COMMENT ON COLUMN disbursement_requests.utility_balance_at_transaction IS 'Utility account balance at the time of transaction from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.working_balance_at_transaction IS 'Working account balance at the time of transaction from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.charges_balance_at_transaction IS 'Charges account balance at the time of transaction from M-Pesa callback';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name LIKE '%balance%';
