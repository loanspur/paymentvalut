-- Add missing columns to SMS tables
-- This script adds the missing columns that are causing the status update issues

-- Add missing columns to sms_bulk_campaigns table
DO $$ 
BEGIN
    -- Add delivered_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sms_bulk_campaigns' 
        AND column_name = 'delivered_count'
    ) THEN
        ALTER TABLE sms_bulk_campaigns 
        ADD COLUMN delivered_count INTEGER DEFAULT 0;
    END IF;

    -- Add failed_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sms_bulk_campaigns' 
        AND column_name = 'failed_count'
    ) THEN
        ALTER TABLE sms_bulk_campaigns 
        ADD COLUMN failed_count INTEGER DEFAULT 0;
    END IF;

    -- Add sent_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sms_bulk_campaigns' 
        AND column_name = 'sent_count'
    ) THEN
        ALTER TABLE sms_bulk_campaigns 
        ADD COLUMN sent_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add missing columns to sms_notifications table
DO $$ 
BEGIN
    -- Add bulk_campaign_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sms_notifications' 
        AND column_name = 'bulk_campaign_id'
    ) THEN
        ALTER TABLE sms_notifications 
        ADD COLUMN bulk_campaign_id UUID REFERENCES sms_bulk_campaigns(id);
    END IF;

    -- Add sent_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sms_notifications' 
        AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE sms_notifications 
        ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing campaigns with default values
UPDATE sms_bulk_campaigns 
SET 
    delivered_count = COALESCE(delivered_count, 0),
    failed_count = COALESCE(failed_count, 0),
    sent_count = COALESCE(sent_count, 0)
WHERE delivered_count IS NULL OR failed_count IS NULL OR sent_count IS NULL;

-- Display the updated schema
SELECT 
    'sms_bulk_campaigns' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sms_bulk_campaigns' 
AND column_name IN ('delivered_count', 'failed_count', 'sent_count')
ORDER BY column_name;

SELECT 
    'sms_notifications' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sms_notifications' 
AND column_name IN ('bulk_campaign_id', 'sent_at')
ORDER BY column_name;