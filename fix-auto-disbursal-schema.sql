-- Fix auto-disbursal configs table schema
-- Add missing is_active column if it doesn't exist

DO $$ 
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loan_product_auto_disbursal_configs' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE loan_product_auto_disbursal_configs 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        
        -- Update existing records to be active
        UPDATE loan_product_auto_disbursal_configs 
        SET is_active = true 
        WHERE is_active IS NULL;
        
        -- Make the column NOT NULL
        ALTER TABLE loan_product_auto_disbursal_configs 
        ALTER COLUMN is_active SET NOT NULL;
        
        RAISE NOTICE 'Added is_active column to loan_product_auto_disbursal_configs table';
    ELSE
        RAISE NOTICE 'is_active column already exists in loan_product_auto_disbursal_configs table';
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'loan_product_auto_disbursal_configs'
ORDER BY ordinal_position;


