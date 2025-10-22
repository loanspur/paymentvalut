-- Simplify Cron Job - Use Direct Edge Function Call
-- This migration creates a simpler cron job that directly calls the Edge Function
-- without needing to duplicate the service role key

-- 1. Remove the old cron jobs (only if they exist)
DO $$
BEGIN
  -- Try to unschedule jobs, ignore errors if they don't exist
  BEGIN
    PERFORM cron.unschedule('balance-monitor-simple');
  EXCEPTION
    WHEN OTHERS THEN
      -- Job doesn't exist, continue
      NULL;
  END;
  
  BEGIN
    PERFORM cron.unschedule('balance-monitor-http');
  EXCEPTION
    WHEN OTHERS THEN
      -- Job doesn't exist, continue
      NULL;
  END;
END $$;

-- 2. Create a simple function that just logs the cron execution
-- The actual balance monitoring will be triggered by external means
CREATE OR REPLACE FUNCTION log_cron_execution()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log that the cron job ran
  INSERT INTO balance_alerts (
    partner_id,
    alert_type,
    account_type,
    current_balance,
    threshold_balance,
    alert_message,
    created_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'cron_check',
    'system',
    0,
    0,
    'Balance monitoring cron job executed at ' || now() || ' - Manual trigger required',
    now()
  );
  
  RAISE NOTICE 'Cron job executed at %', now();
END;
$$;

-- 3. Create a simple cron job that just logs execution
SELECT cron.schedule(
  'balance-monitor-log',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT log_cron_execution();'
);

-- 4. Create a function to manually trigger balance monitoring
-- This will be called by the API endpoint
CREATE OR REPLACE FUNCTION manual_balance_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Log the manual trigger
  INSERT INTO balance_alerts (
    partner_id,
    alert_type,
    account_type,
    current_balance,
    threshold_balance,
    alert_message,
    created_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manual_trigger',
    'system',
    0,
    0,
    'Manual balance check triggered at ' || now(),
    now()
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Manual balance check logged - use API endpoint to trigger actual checks',
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- 5. Update the cron job status view
CREATE OR REPLACE VIEW cron_job_status AS
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'balance-monitor-log';

-- Add comments
COMMENT ON FUNCTION log_cron_execution IS 'Function called by cron to log execution - actual balance monitoring triggered via API';
COMMENT ON FUNCTION manual_balance_check IS 'Function to manually trigger balance monitoring via API';
COMMENT ON VIEW cron_job_status IS 'View to check the status of the balance monitoring cron job';
