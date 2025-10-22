-- Fix missing currency column in disbursement_requests table
-- This script adds the missing currency column that the webhook handler expects

-- Check if currency column exists
DO $$
BEGIN
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'KES';
        
        -- Update existing records to have KES as default currency
        UPDATE disbursement_requests 
        SET currency = 'KES' 
        WHERE currency IS NULL;
        
        RAISE NOTICE 'Added currency column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'Currency column already exists in disbursement_requests table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
AND column_name = 'currency';

-- Check a few sample records
SELECT 
    id, 
    amount, 
    currency, 
    status, 
    created_at
FROM disbursement_requests 
ORDER BY created_at DESC 
LIMIT 5;
