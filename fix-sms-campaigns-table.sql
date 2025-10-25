-- Fix SMS Bulk Campaigns Table Schema
-- Run this in your Supabase SQL Editor to fix the missing columns

-- First, check if the table exists and what columns it has
DO $$
BEGIN
    -- Check if sms_bulk_campaigns table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_bulk_campaigns') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_bulk_campaigns' AND column_name = 'recipient_list') THEN
            ALTER TABLE sms_bulk_campaigns ADD COLUMN recipient_list JSONB DEFAULT '[]';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_bulk_campaigns' AND column_name = 'total_recipients') THEN
            ALTER TABLE sms_bulk_campaigns ADD COLUMN total_recipients INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_bulk_campaigns' AND column_name = 'total_cost') THEN
            ALTER TABLE sms_bulk_campaigns ADD COLUMN total_cost DECIMAL(15,4) DEFAULT 0.00;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_bulk_campaigns' AND column_name = 'created_by') THEN
            ALTER TABLE sms_bulk_campaigns ADD COLUMN created_by UUID;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_bulk_campaigns' AND column_name = 'message_content') THEN
            ALTER TABLE sms_bulk_campaigns ADD COLUMN message_content TEXT;
        END IF;
        
        -- Rename columns if they exist with different names
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_bulk_campaigns' AND column_name = 'recipients_count') THEN
            ALTER TABLE sms_bulk_campaigns RENAME COLUMN recipients_count TO total_recipients;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_bulk_campaigns' AND column_name = 'total_sms_cost') THEN
            ALTER TABLE sms_bulk_campaigns RENAME COLUMN total_sms_cost TO total_cost;
        END IF;
        
        RAISE NOTICE 'SMS bulk campaigns table updated successfully!';
    ELSE
        -- Create the table with correct schema if it doesn't exist
        CREATE TABLE sms_bulk_campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
            campaign_name VARCHAR(255) NOT NULL,
            template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
            message_content TEXT,
            recipient_list JSONB DEFAULT '[]',
            total_recipients INTEGER DEFAULT 0,
            total_cost DECIMAL(15,4) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'draft',
            scheduled_at TIMESTAMP,
            sent_at TIMESTAMP,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Create trigger for updated_at
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'update_sms_bulk_campaigns_updated_at'
        ) THEN
            CREATE TRIGGER update_sms_bulk_campaigns_updated_at
                BEFORE UPDATE ON sms_bulk_campaigns
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Grant permissions
        GRANT ALL ON sms_bulk_campaigns TO authenticated;
        
        RAISE NOTICE 'SMS bulk campaigns table created successfully!';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sms_bulk_campaigns' 
ORDER BY ordinal_position;

-- Success message
SELECT 'SMS bulk campaigns table is ready!' as message;
