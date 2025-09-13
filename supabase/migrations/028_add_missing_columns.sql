-- Add missing columns to disbursement_requests table
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS transaction_receipt TEXT;

-- Add index for transaction receipt lookups
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_transaction_receipt 
ON disbursement_requests(transaction_receipt);

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name IN ('transaction_receipt', 'status', 'result_code', 'result_desc')
ORDER BY column_name;
