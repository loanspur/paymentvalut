-- Fix foreign key relationship for sms_bulk_campaigns.template_id
-- Run this in your Supabase SQL Editor

-- First, check if the foreign key constraint exists
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'sms_bulk_campaigns_template_id_fkey'
        AND table_name = 'sms_bulk_campaigns'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE sms_bulk_campaigns 
        ADD CONSTRAINT sms_bulk_campaigns_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES sms_templates(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key constraint added successfully!';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists.';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'sms_bulk_campaigns'
    AND kcu.column_name = 'template_id';

-- Success message
SELECT 'Foreign key constraint fixed successfully!' as message;
