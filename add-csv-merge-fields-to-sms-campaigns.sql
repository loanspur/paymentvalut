-- Add CSV data and merge fields support to SMS campaigns
-- This migration adds columns to store CSV data and merge field information

-- Add csv_data column to store the parsed CSV data as JSON
ALTER TABLE sms_bulk_campaigns 
ADD COLUMN IF NOT EXISTS csv_data JSONB;

-- Add merge_fields column to store available merge fields as JSON array
ALTER TABLE sms_bulk_campaigns 
ADD COLUMN IF NOT EXISTS merge_fields JSONB;

-- Add index on csv_data for better query performance
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_csv_data 
ON sms_bulk_campaigns USING GIN (csv_data);

-- Add index on merge_fields for better query performance
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_merge_fields 
ON sms_bulk_campaigns USING GIN (merge_fields);

-- Add comment to document the new columns
COMMENT ON COLUMN sms_bulk_campaigns.csv_data IS 'JSON data from uploaded CSV file containing recipient information and merge fields';
COMMENT ON COLUMN sms_bulk_campaigns.merge_fields IS 'Array of available merge field names that can be used in message templates';

-- Example of how the data will be stored:
-- csv_data: [
--   {"phone_number": "254700000000", "first_name": "John", "last_name": "Doe", "amount": "1000"},
--   {"phone_number": "254700000001", "first_name": "Jane", "last_name": "Smith", "amount": "2500"}
-- ]
-- merge_fields: ["first_name", "last_name", "amount", "date", "reference"]

-- Update existing campaigns to have null values for the new columns
UPDATE sms_bulk_campaigns 
SET csv_data = NULL, merge_fields = NULL 
WHERE csv_data IS NULL OR merge_fields IS NULL;

