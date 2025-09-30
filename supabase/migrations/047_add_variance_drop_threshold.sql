-- Add variance_drop_threshold column to balance_monitoring_config table
-- This column will store the KES amount threshold for variance drop alerts
-- This migration handles the case where the column might already exist with wrong precision

DO $$ 
BEGIN
    -- Add variance_drop_threshold column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_monitoring_config' 
        AND column_name = 'variance_drop_threshold'
    ) THEN
        -- First add the column as nullable to avoid constraint issues
        ALTER TABLE balance_monitoring_config 
        ADD COLUMN variance_drop_threshold DECIMAL(15,2);
        
        -- Add a comment to explain the column
        COMMENT ON COLUMN balance_monitoring_config.variance_drop_threshold IS 'KES amount threshold for variance drop alerts (e.g., 5000.00 = 5000 KES)';
    END IF;
END $$;

-- CRITICAL: Fix column precision BEFORE updating data
-- This must be done first to avoid numeric overflow errors
DO $$
BEGIN
    -- Check if column exists but has wrong data type (precision too small)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_monitoring_config' 
        AND column_name = 'variance_drop_threshold'
        AND data_type = 'numeric'
        AND numeric_precision < 15
    ) THEN
        -- Alter the column to have the correct precision FIRST
        ALTER TABLE balance_monitoring_config 
        ALTER COLUMN variance_drop_threshold TYPE DECIMAL(15,2);
        
        RAISE NOTICE 'Updated variance_drop_threshold column precision to DECIMAL(15,2)';
    END IF;
END $$;

-- Now safely update existing records to have a default variance drop threshold
-- This will work after the precision has been fixed
UPDATE balance_monitoring_config 
SET variance_drop_threshold = 5000.00 
WHERE variance_drop_threshold IS NULL;

-- Now make the column NOT NULL with default value (only if it's currently nullable)
DO $$
BEGIN
    -- Check if column exists and is nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_monitoring_config' 
        AND column_name = 'variance_drop_threshold'
        AND is_nullable = 'YES'
    ) THEN
        -- Set default value for any remaining NULL values
        UPDATE balance_monitoring_config 
        SET variance_drop_threshold = 5000.00 
        WHERE variance_drop_threshold IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE balance_monitoring_config 
        ALTER COLUMN variance_drop_threshold SET NOT NULL;
        
        -- Set the default value for the column
        ALTER TABLE balance_monitoring_config 
        ALTER COLUMN variance_drop_threshold SET DEFAULT 5000.00;
        
        RAISE NOTICE 'Set variance_drop_threshold column to NOT NULL with default 5000.00';
    END IF;
END $$;

-- Add a check constraint to ensure the threshold is at least 1 KES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_variance_drop_threshold_min'
    ) THEN
        ALTER TABLE balance_monitoring_config 
        ADD CONSTRAINT chk_variance_drop_threshold_min 
        CHECK (variance_drop_threshold >= 1.00);
        
        RAISE NOTICE 'Added check constraint for variance_drop_threshold minimum value';
    END IF;
END $$;
