-- Add missing conversation ID columns to disbursement_requests table
-- This fixes the 500 error that occurs after successful M-Pesa transactions

ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS conversation_id TEXT,
ADD COLUMN IF NOT EXISTS originator_conversation_id TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_conversation_id 
ON disbursement_requests(conversation_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_requests_originator_conversation_id 
ON disbursement_requests(originator_conversation_id);

-- Add comments for documentation
COMMENT ON COLUMN disbursement_requests.conversation_id IS 'M-Pesa conversation ID for callback matching';
COMMENT ON COLUMN disbursement_requests.originator_conversation_id IS 'M-Pesa originator conversation ID for callback matching';
