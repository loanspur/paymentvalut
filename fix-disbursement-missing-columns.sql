-- Fix all missing columns in disbursement_requests table
-- This script adds all missing columns that the webhook handler expects

DO $$
BEGIN
    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN description TEXT;
        
        RAISE NOTICE 'Added description column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'Description column already exists in disbursement_requests table';
    END IF;

    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN metadata JSONB;
        
        RAISE NOTICE 'Added metadata column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'Metadata column already exists in disbursement_requests table';
    END IF;

    -- Add msisdn column if it doesn't exist (alternative to phone_number)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'msisdn'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN msisdn VARCHAR(20);
        
        RAISE NOTICE 'Added msisdn column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'msisdn column already exists in disbursement_requests table';
    END IF;

    -- Add customer_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN customer_id VARCHAR(50);
        
        RAISE NOTICE 'Added customer_id column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'customer_id column already exists in disbursement_requests table';
    END IF;

    -- Add client_request_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'client_request_id'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN client_request_id VARCHAR(100);
        
        RAISE NOTICE 'Added client_request_id column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'client_request_id column already exists in disbursement_requests table';
    END IF;

    -- Add external_reference column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'external_reference'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN external_reference VARCHAR(100);
        
        RAISE NOTICE 'Added external_reference column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'external_reference column already exists in disbursement_requests table';
    END IF;

    -- Add origin column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'origin'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN origin VARCHAR(50);
        
        RAISE NOTICE 'Added origin column to disbursement_requests table';
    ELSE
        RAISE NOTICE 'Origin column already exists in disbursement_requests table';
    END IF;

END $$;

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'disbursement_requests' 
ORDER BY column_name;

-- Check a few sample records
SELECT 
    id, 
    amount, 
    currency, 
    description,
    status, 
    created_at
FROM disbursement_requests 
ORDER BY created_at DESC 
LIMIT 5;
