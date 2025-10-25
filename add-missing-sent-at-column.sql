-- Add missing sent_at column to sms_bulk_campaigns table
-- Run this in your Supabase SQL Editor

-- Add the missing sent_at column
ALTER TABLE sms_bulk_campaigns 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sms_bulk_campaigns' 
AND column_name = 'sent_at';

-- Success message
SELECT 'sent_at column added successfully!' as message;
