-- Fix Cron Job to Actually Call Edge Functions
-- This migration creates a proper cron job that calls the balance-monitor Edge Function

-- 1. Remove the old simple cron job
SELECT cron.unschedule('balance-monitor-simple');

-- 2. Create a function that makes HTTP calls to the Edge Function
CREATE OR REPLACE FUNCTION trigger_balance_monitoring_http()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_key text;
  response text;
  result jsonb;
BEGIN
  -- Get settings
  SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM app_settings WHERE key = 'service_role_key';
  
  -- Check if we have valid settings
  IF supabase_url IS NULL OR service_key IS NULL OR service_key = 'your-actual-service-role-key-here' THEN
    RAISE NOTICE 'Cron job skipped: Invalid or missing settings (URL: %, Key: %)', supabase_url, CASE WHEN service_key = 'your-actual-service-role-key-here' THEN 'PLACEHOLDER' ELSE 'SET' END;
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
    SELECT content::jsonb INTO result
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
      'Balance monitoring cron job completed successfully: ' || COALESCE(result->>'message', 'No message'),
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

-- 3. Create the new cron job that calls the HTTP function
SELECT cron.schedule(
  'balance-monitor-http',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT trigger_balance_monitoring_http();'
);

-- 4. Update the cron job status view
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
WHERE jobname = 'balance-monitor-http';

-- Add comments
COMMENT ON FUNCTION trigger_balance_monitoring_http IS 'Function called by cron to trigger balance monitoring via HTTP calls to Edge Functions';
COMMENT ON VIEW cron_job_status IS 'View to check the status of the balance monitoring cron job';
