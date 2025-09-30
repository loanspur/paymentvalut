-- Diagnostic script to check cron job status
-- Run this in Supabase SQL Editor to diagnose cron issues

-- 1. Check if pg_cron extension is enabled
SELECT 
  extname, 
  extversion, 
  extrelocatable 
FROM pg_extension 
WHERE extname = 'pg_cron';

-- 2. Check all scheduled cron jobs
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
ORDER BY jobid;

-- 3. Check app_settings table
SELECT * FROM app_settings;

-- 4. Check if balance_monitoring_config table exists and has data
SELECT 
  COUNT(*) as config_count,
  COUNT(CASE WHEN is_enabled = true THEN 1 END) as enabled_count
FROM balance_monitoring_config;

-- 5. Check recent balance alerts (to see if cron is running)
SELECT 
  alert_type,
  alert_message,
  created_at
FROM balance_alerts 
WHERE alert_type = 'cron_check'
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Check cron job history (if available)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'balance-monitor-simple')
ORDER BY start_time DESC 
LIMIT 10;
