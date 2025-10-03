-- Comprehensive fix for all missing columns in disbursement_requests table
-- This script adds all the columns needed for proper M-Pesa callback processing

-- Add conversation ID columns (for callback matching)
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS conversation_id TEXT,
ADD COLUMN IF NOT EXISTS originator_conversation_id TEXT;

-- Add balance columns (for utility balance storage)
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS utility_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS working_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS charges_balance_at_transaction DECIMAL(15,2);

-- Add M-Pesa transaction details columns
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS transaction_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS transaction_date TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_conversation_id 
ON disbursement_requests(conversation_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_requests_originator_conversation_id 
ON disbursement_requests(originator_conversation_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_requests_transaction_id 
ON disbursement_requests(transaction_id);

-- Add comments for documentation
COMMENT ON COLUMN disbursement_requests.conversation_id IS 'M-Pesa conversation ID for callback matching';
COMMENT ON COLUMN disbursement_requests.originator_conversation_id IS 'M-Pesa originator conversation ID for callback matching';
COMMENT ON COLUMN disbursement_requests.utility_balance_at_transaction IS 'Utility account balance at the time of transaction from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.working_balance_at_transaction IS 'Working account balance at the time of transaction from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.charges_balance_at_transaction IS 'Charges account balance at the time of transaction from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.transaction_id IS 'M-Pesa transaction ID from callback';
COMMENT ON COLUMN disbursement_requests.receipt_number IS 'M-Pesa receipt number from callback';
COMMENT ON COLUMN disbursement_requests.customer_name IS 'Customer name from M-Pesa callback';

-- Verify all columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name IN (
    'conversation_id', 
    'originator_conversation_id',
    'utility_balance_at_transaction',
    'working_balance_at_transaction', 
    'charges_balance_at_transaction',
    'transaction_id',
    'receipt_number',
    'transaction_amount',
    'transaction_date',
    'customer_name'
)
ORDER BY column_name;
