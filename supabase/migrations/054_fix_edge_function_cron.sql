-- Fix Edge Function Cron Job
-- This migration creates a proper cron job that calls the Edge Functions

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Remove any existing cron jobs (ignore errors if they don't exist)
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('balance-monitor-simple');
  EXCEPTION WHEN OTHERS THEN
    -- Job doesn't exist, ignore
  END;
  
  BEGIN
    PERFORM cron.unschedule('balance-monitor-http');
  EXCEPTION WHEN OTHERS THEN
    -- Job doesn't exist, ignore
  END;
  
  BEGIN
    PERFORM cron.unschedule('balance-monitor-log');
  EXCEPTION WHEN OTHERS THEN
    -- Job doesn't exist, ignore
  END;
END $$;

-- 3. Update app_settings with correct values
-- You need to replace these with your actual values
UPDATE app_settings 
SET value = 'https://mapgmmiobityxaaevomp.supabase.co'
WHERE key = 'supabase_url';

-- For the service key, we'll use a placeholder that you need to update
UPDATE app_settings 
SET value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY3NzQwMCwiZXhwIjoyMDUyMjUzNDAwfQ.PLACEHOLDER_SERVICE_ROLE_KEY'
WHERE key = 'service_role_key';

-- 4. Create a function that calls the Edge Function
CREATE OR REPLACE FUNCTION trigger_balance_monitoring_edge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_key text;
  response http_response;
  result jsonb;
BEGIN
  -- Get settings
  SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM app_settings WHERE key = 'service_role_key';
  
  -- Check if we have valid settings
  IF supabase_url IS NULL OR service_key IS NULL OR service_key LIKE '%PLACEHOLDER%' THEN
    RAISE NOTICE 'Cron job skipped: Invalid or missing settings (URL: %, Key: %)', 
      supabase_url, 
      CASE WHEN service_key LIKE '%PLACEHOLDER%' THEN 'PLACEHOLDER' ELSE 'SET' END;
    RETURN;
  END IF;
  
  -- Log that the cron job started
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
    'Balance monitoring cron job started at ' || now(),
    now()
  );
  
  -- Make HTTP call to the cron-balance-monitor Edge Function
  BEGIN
    SELECT * INTO response
    FROM http((
      'POST',
      supabase_url || '/functions/v1/cron-balance-monitor',
      ARRAY[
        http_header('Authorization', 'Bearer ' || service_key),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      '{}'
    ));
    
    -- Parse response
    result := response.content::jsonb;
    
    -- Log successful response
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
      'cron_success',
      'system',
      0,
      0,
      'Balance monitoring cron job completed: ' || COALESCE(result->>'message', 'Success'),
      now()
    );
    
    RAISE NOTICE 'Cron job completed successfully: %', result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error
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
      'cron_error',
      'system',
      0,
      0,
      'Balance monitoring cron job failed: ' || SQLERRM,
      now()
    );
    
    RAISE NOTICE 'Cron job failed: %', SQLERRM;
  END;
END;
$$;

-- 5. Create the cron job
SELECT cron.schedule(
  'balance-monitor-edge',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT trigger_balance_monitoring_edge();'
);

-- 6. Update the cron job status view
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
WHERE jobname = 'balance-monitor-edge';

-- Add comments
COMMENT ON FUNCTION trigger_balance_monitoring_edge IS 'Function called by cron to trigger balance monitoring via Edge Functions';
COMMENT ON VIEW cron_job_status IS 'View to check the status of the balance monitoring cron job';
