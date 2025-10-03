-- Check if conversation_id columns exist in disbursement_requests table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name IN ('conversation_id', 'originator_conversation_id');

-- If columns don't exist, add them
ALTER TABLE disbursement_requests 
ADD COLUMN IF NOT EXISTS conversation_id TEXT,
ADD COLUMN IF NOT EXISTS originator_conversation_id TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_conversation_id 
ON disbursement_requests(conversation_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_requests_originator_conversation_id 
ON disbursement_requests(originator_conversation_id);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name IN ('conversation_id', 'originator_conversation_id');
