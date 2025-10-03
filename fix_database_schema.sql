-- Fix database schema for disbursement_requests table
-- Add missing columns that the callback functions expect

-- Add missing M-Pesa transaction columns
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS transaction_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS transaction_date TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add missing balance columns
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS utility_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS working_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS charges_balance_at_transaction DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS balance_updated_at_transaction TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_transaction_id 
ON disbursement_requests(transaction_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_requests_receipt_number 
ON disbursement_requests(receipt_number);

CREATE INDEX IF NOT EXISTS idx_disbursement_requests_customer_name 
ON disbursement_requests(customer_name);

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name IN (
  'transaction_id', 
  'receipt_number', 
  'transaction_amount', 
  'transaction_date', 
  'customer_name',
  'utility_balance_at_transaction',
  'working_balance_at_transaction',
  'charges_balance_at_transaction',
  'balance_updated_at_transaction'
)
ORDER BY column_name;
