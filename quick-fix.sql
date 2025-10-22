-- ==============================================
-- QUICK FIX FOR BALANCE MONITORING
-- ==============================================
-- Run this in Supabase SQL Editor to fix the issues

-- 1. Update balance monitoring config to check every minute
UPDATE balance_monitoring_config 
SET check_interval_minutes = 1
WHERE check_interval_minutes > 5;

-- 2. Enable monitoring for all partners
UPDATE balance_monitoring_config 
SET is_enabled = true
WHERE is_enabled = false;

-- 3. Add shared credentials column to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS use_shared_credentials BOOLEAN DEFAULT true;

-- 4. Create shared credentials table with proper unique constraint
CREATE TABLE IF NOT EXISTS shared_mpesa_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE DEFAULT 'default_shared_credentials',
    consumer_key TEXT NOT NULL,
    consumer_secret TEXT NOT NULL,
    initiator_password TEXT NOT NULL,
    security_credential TEXT NOT NULL,
    initiator_name TEXT NOT NULL DEFAULT 'shared_initiator',
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert default shared credentials (only if not exists)
INSERT INTO shared_mpesa_credentials (
    name,
    consumer_key,
    consumer_secret,
    initiator_password,
    security_credential,
    initiator_name,
    environment,
    is_active
) 
SELECT 
    'default_shared_credentials',
    'YOUR_SHARED_CONSUMER_KEY',
    'YOUR_SHARED_CONSUMER_SECRET',
    'YOUR_SHARED_INITIATOR_PASSWORD',
    'YOUR_SHARED_SECURITY_CREDENTIAL',
    'shared_initiator',
    'sandbox',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM shared_mpesa_credentials WHERE name = 'default_shared_credentials'
);

-- 6. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_balance_requests_partner_status ON balance_requests(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_balance_requests_updated_at ON balance_requests(updated_at DESC);

-- 7. Create real-time balance function
CREATE OR REPLACE FUNCTION get_realtime_balance(partner_uuid UUID)
RETURNS TABLE (
    partner_id UUID,
    utility_balance DECIMAL(15,2),
    working_balance DECIMAL(15,2),
    charges_balance DECIMAL(15,2),
    last_updated TIMESTAMP WITH TIME ZONE,
    data_freshness VARCHAR(20),
    source VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        br.partner_id,
        br.utility_account_balance,
        br.working_account_balance,
        br.charges_account_balance,
        br.updated_at,
        CASE 
            WHEN br.updated_at > NOW() - INTERVAL '5 minutes' THEN 'fresh'
            WHEN br.updated_at > NOW() - INTERVAL '1 hour' THEN 'recent'
            ELSE 'stale'
        END as data_freshness,
        'balance_check' as source
    FROM balance_requests br
    WHERE br.partner_id = partner_uuid
        AND br.status = 'completed'
        AND br.utility_account_balance IS NOT NULL
    ORDER BY br.updated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 8. Create real-time balance dashboard view
CREATE OR REPLACE VIEW realtime_balance_dashboard AS
SELECT 
    p.id as partner_id,
    p.name as partner_name,
    p.mpesa_shortcode,
    br.utility_account_balance,
    br.working_account_balance,
    br.charges_account_balance,
    br.updated_at as last_updated,
    CASE 
        WHEN br.updated_at > NOW() - INTERVAL '5 minutes' THEN 'fresh'
        WHEN br.updated_at > NOW() - INTERVAL '1 hour' THEN 'recent'
        ELSE 'stale'
    END as data_freshness,
    EXTRACT(EPOCH FROM (NOW() - br.updated_at))/60 as minutes_since_update,
    bmc.check_interval_minutes,
    bmc.is_enabled as monitoring_enabled
FROM partners p
LEFT JOIN balance_requests br ON p.id = br.partner_id 
    AND br.status = 'completed' 
    AND br.utility_account_balance IS NOT NULL
    AND br.updated_at = (
        SELECT MAX(updated_at) 
        FROM balance_requests br2 
        WHERE br2.partner_id = p.id 
            AND br2.status = 'completed'
    )
LEFT JOIN balance_monitoring_config bmc ON p.id = bmc.partner_id
WHERE p.is_active = true AND p.is_mpesa_configured = true
ORDER BY br.updated_at DESC NULLS LAST;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check if the fixes were applied
SELECT 
    'balance_monitoring_config' as table_name,
    COUNT(*) as total_configs,
    AVG(check_interval_minutes) as avg_interval_minutes,
    COUNT(CASE WHEN is_enabled = true THEN 1 END) as enabled_configs
FROM balance_monitoring_config;

-- Check shared credentials table
SELECT 
    'shared_mpesa_credentials' as table_name,
    COUNT(*) as total_credentials,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_credentials
FROM shared_mpesa_credentials;

-- Check real-time dashboard
SELECT 
    'realtime_balance_dashboard' as view_name,
    COUNT(*) as total_partners,
    COUNT(CASE WHEN data_freshness = 'fresh' THEN 1 END) as fresh_data,
    COUNT(CASE WHEN data_freshness = 'stale' THEN 1 END) as stale_data
FROM realtime_balance_dashboard;

