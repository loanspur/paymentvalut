-- Add variance_drop_threshold column to balance_monitoring_config table
-- This column stores the KES amount threshold for variance drop alerts

DO $$ 
BEGIN
    -- Add variance_drop_threshold column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_monitoring_config' 
        AND column_name = 'variance_drop_threshold'
    ) THEN
        -- Add the column as nullable first
        ALTER TABLE balance_monitoring_config 
        ADD COLUMN variance_drop_threshold DECIMAL(15,2);
        
        -- Add a comment to explain the column
        COMMENT ON COLUMN balance_monitoring_config.variance_drop_threshold IS 'KES amount threshold for variance drop alerts (e.g., 5000.00 = 5000 KES drop)';
        
        RAISE NOTICE 'Added variance_drop_threshold column to balance_monitoring_config';
    ELSE
        RAISE NOTICE 'variance_drop_threshold column already exists in balance_monitoring_config';
    END IF;
END $$;

-- Set default value for existing records
UPDATE balance_monitoring_config 
SET variance_drop_threshold = 5000.00 
WHERE variance_drop_threshold IS NULL;

-- Add check constraint for minimum value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
        WHERE cc.constraint_name = 'chk_variance_drop_threshold_min'
        AND ccu.table_name = 'balance_monitoring_config'
    ) THEN
        ALTER TABLE balance_monitoring_config 
        ADD CONSTRAINT chk_variance_drop_threshold_min 
        CHECK (variance_drop_threshold >= 1.00);
        
        RAISE NOTICE 'Added check constraint for variance_drop_threshold minimum value';
    ELSE
        RAISE NOTICE 'Check constraint for variance_drop_threshold already exists';
    END IF;
END $$;

-- Set default value for the column
ALTER TABLE balance_monitoring_config 
ALTER COLUMN variance_drop_threshold SET DEFAULT 5000.00;

-- Add comment for documentation
COMMENT ON COLUMN balance_monitoring_config.variance_drop_threshold IS 'KES amount threshold for variance drop alerts (e.g., 5000.00 = 5000 KES drop). No upper limit as this represents real money amounts.';
