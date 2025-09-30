-- Add utility balance columns to disbursement_requests table
-- These columns will store the utility account balance at the time of each transaction

DO $$ 
BEGIN
    -- Add utility_balance_at_transaction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'utility_balance_at_transaction'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN utility_balance_at_transaction DECIMAL(15,2);
        
        COMMENT ON COLUMN disbursement_requests.utility_balance_at_transaction IS 'Utility account balance at the time of this transaction';
    END IF;

    -- Add working_balance_at_transaction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'working_balance_at_transaction'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN working_balance_at_transaction DECIMAL(15,2);
        
        COMMENT ON COLUMN disbursement_requests.working_balance_at_transaction IS 'Working account balance at the time of this transaction';
    END IF;

    -- Add charges_balance_at_transaction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'charges_balance_at_transaction'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN charges_balance_at_transaction DECIMAL(15,2);
        
        COMMENT ON COLUMN disbursement_requests.charges_balance_at_transaction IS 'Charges account balance at the time of this transaction';
    END IF;

    -- Add balance_updated_at_transaction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disbursement_requests' 
        AND column_name = 'balance_updated_at_transaction'
    ) THEN
        ALTER TABLE disbursement_requests 
        ADD COLUMN balance_updated_at_transaction TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN disbursement_requests.balance_updated_at_transaction IS 'Timestamp when the balance was recorded for this transaction';
    END IF;

    RAISE NOTICE 'Successfully added utility balance columns to disbursement_requests table';
END $$;
