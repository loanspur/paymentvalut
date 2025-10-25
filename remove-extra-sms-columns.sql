-- Remove extra columns from sms_bulk_campaigns table
-- Run this in your Supabase SQL Editor to fix the 500 error

-- Remove extra columns that are causing API issues
ALTER TABLE sms_bulk_campaigns DROP COLUMN IF EXISTS sent_count;
ALTER TABLE sms_bulk_campaigns DROP COLUMN IF EXISTS delivered_count;
ALTER TABLE sms_bulk_campaigns DROP COLUMN IF EXISTS failed_count;
ALTER TABLE sms_bulk_campaigns DROP COLUMN IF EXISTS started_at;
ALTER TABLE sms_bulk_campaigns DROP COLUMN IF EXISTS completed_at;

-- Verify the table structure after cleanup
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sms_bulk_campaigns' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT 'Extra columns removed successfully! SMS campaigns API should now work.' as message;
