-- Add missing M-Pesa transaction columns to disbursement_requests table
-- These columns are being updated by the M-Pesa callback Edge Function

ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS transaction_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS transaction_date TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_transaction_id 
ON disbursement_requests(transaction_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_requests_receipt_number 
ON disbursement_requests(receipt_number);

-- Add comments explaining the columns
COMMENT ON COLUMN disbursement_requests.transaction_id IS 'M-Pesa transaction ID from callback';
COMMENT ON COLUMN disbursement_requests.receipt_number IS 'M-Pesa receipt number from callback';
COMMENT ON COLUMN disbursement_requests.transaction_amount IS 'Transaction amount from M-Pesa callback';
COMMENT ON COLUMN disbursement_requests.transaction_date IS 'Transaction date from M-Pesa callback';

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name IN ('transaction_id', 'receipt_number', 'transaction_amount', 'transaction_date', 'created_at', 'updated_at')
ORDER BY column_name;
