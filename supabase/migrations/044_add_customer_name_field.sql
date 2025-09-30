-- Add customer name field to store actual customer name from M-Pesa callback
-- This will store the real customer name extracted from M-Pesa response

ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add index for customer name searches
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_customer_name 
ON disbursement_requests(customer_name);

-- Add comment explaining the column
COMMENT ON COLUMN disbursement_requests.customer_name IS 'Actual customer name from M-Pesa callback response';

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name = 'customer_name';
