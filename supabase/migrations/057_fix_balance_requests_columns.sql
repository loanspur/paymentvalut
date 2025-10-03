-- Fix balance_requests table by adding missing columns
-- The callback handler expects these columns to exist

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add balance_before column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'balance_before'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN balance_before DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.balance_before IS 'Balance before transaction from M-Pesa callback';
    END IF;

    -- Add balance_after column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'balance_after'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN balance_after DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.balance_after IS 'Balance after transaction from M-Pesa callback';
    END IF;

    -- Add utility_account_balance column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'utility_account_balance'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN utility_account_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.utility_account_balance IS 'Utility account balance from M-Pesa callback';
    END IF;

    -- Add working_account_balance column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'working_account_balance'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN working_account_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.working_account_balance IS 'Working account balance from M-Pesa callback';
    END IF;

    -- Add charges_account_balance column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'charges_account_balance'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN charges_account_balance DECIMAL(15,2);
        
        COMMENT ON COLUMN balance_requests.charges_account_balance IS 'Charges account balance from M-Pesa callback';
    END IF;

    -- Add result_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'result_code'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN result_code TEXT;
        
        COMMENT ON COLUMN balance_requests.result_code IS 'M-Pesa result code from callback';
    END IF;

    -- Add result_desc column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'result_desc'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN result_desc TEXT;
        
        COMMENT ON COLUMN balance_requests.result_desc IS 'M-Pesa result description from callback';
    END IF;

    -- Add transaction_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN transaction_id TEXT;
        
        COMMENT ON COLUMN balance_requests.transaction_id IS 'M-Pesa transaction ID from callback';
    END IF;

    -- Add callback_received_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'callback_received_at'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN callback_received_at TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN balance_requests.callback_received_at IS 'Timestamp when callback was received';
    END IF;

    -- Add mpesa_response column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_requests' 
        AND column_name = 'mpesa_response'
    ) THEN
        ALTER TABLE balance_requests 
        ADD COLUMN mpesa_response JSONB;
        
        COMMENT ON COLUMN balance_requests.mpesa_response IS 'Full M-Pesa API response data';
    END IF;

    RAISE NOTICE '✅ All required columns added to balance_requests table';
END $$;

-- Show the current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'balance_requests' 
ORDER BY ordinal_position;
