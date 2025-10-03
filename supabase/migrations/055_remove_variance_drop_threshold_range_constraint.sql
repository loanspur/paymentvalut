-- Remove the incorrect range constraint on variance_drop_threshold
-- The variance_drop_threshold should be an actual amount drop (in KES), not a percentage
-- There should be no upper limit for this threshold as it represents real money amounts

-- Drop the incorrect range constraint if it exists
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_variance_drop_threshold_range'
        AND table_name = 'balance_monitoring_config'
    ) THEN
        ALTER TABLE balance_monitoring_config 
        DROP CONSTRAINT chk_variance_drop_threshold_range;
        
        RAISE NOTICE 'Removed incorrect range constraint on variance_drop_threshold';
    ELSE
        RAISE NOTICE 'Range constraint on variance_drop_threshold does not exist';
    END IF;
END $$;

-- Keep only the minimum value constraint (>= 1.00) which makes sense
-- This ensures the threshold is at least 1 KES
DO $$ 
BEGIN
    -- Check if the minimum constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_variance_drop_threshold_min'
        AND table_name = 'balance_monitoring_config'
    ) THEN
        ALTER TABLE balance_monitoring_config 
        ADD CONSTRAINT chk_variance_drop_threshold_min 
        CHECK (variance_drop_threshold >= 1.00);
        
        RAISE NOTICE 'Added minimum value constraint for variance_drop_threshold (>= 1.00)';
    ELSE
        RAISE NOTICE 'Minimum value constraint on variance_drop_threshold already exists';
    END IF;
END $$;

-- Update the column comment to clarify it's an actual amount, not percentage
COMMENT ON COLUMN balance_monitoring_config.variance_drop_threshold IS 'Actual KES amount threshold for variance drop alerts (e.g., 5000.00 = 5000 KES drop). No upper limit as this represents real money amounts.';
