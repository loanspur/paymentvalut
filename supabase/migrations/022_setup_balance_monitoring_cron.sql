-- Setup Balance Monitoring Cron Job
-- This migration sets up the automatic balance monitoring cron job

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create or replace the cron job for balance monitoring
-- This will run every 15 minutes to check balances
SELECT cron.schedule(
  'balance-monitor-cron',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-balance-monitor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alternative approach using direct function call if net extension is not available
-- Uncomment the following and comment out the above if needed:
-- SELECT cron.schedule(
--   'balance-monitor-direct',
--   '*/15 * * * *',
--   'SELECT cron_balance_monitor();'
-- );

-- Create a function that calls the edge function
CREATE OR REPLACE FUNCTION cron_balance_monitor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response text;
BEGIN
  -- This would need to be implemented based on your specific setup
  -- For now, we'll just log that the cron job ran
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
    'Balance monitoring cron job executed at ' || now(),
    now()
  );
END;
$$;

-- Create a settings table to store configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings (these should be updated with actual values)
INSERT INTO app_settings (key, value, description) VALUES
  ('supabase_url', 'https://your-project.supabase.co', 'Supabase project URL'),
  ('service_role_key', 'your-service-role-key', 'Supabase service role key')
ON CONFLICT (key) DO NOTHING;

-- Create a function to update settings
CREATE OR REPLACE FUNCTION update_app_setting(setting_key VARCHAR(100), setting_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO app_settings (key, value, updated_at)
  VALUES (setting_key, setting_value, NOW())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();
END;
$$;

-- Add comments
COMMENT ON TABLE app_settings IS 'Application settings for cron jobs and other configurations';
COMMENT ON FUNCTION update_app_setting IS 'Function to update application settings';

-- Create a view to check cron job status
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
WHERE jobname = 'balance-monitor-cron';

COMMENT ON VIEW cron_job_status IS 'View to check the status of the balance monitoring cron job';
