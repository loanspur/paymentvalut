-- ==============================================
-- BALANCE MONITORING REAL-TIME FIXES
-- ==============================================
-- Apply these fixes to resolve stale balance data issues

-- 1. Update balance monitoring config to check every minute for real-time updates
UPDATE balance_monitoring_config 
SET check_interval_minutes = 1
WHERE check_interval_minutes > 5;

-- 2. Ensure all partners have monitoring enabled
UPDATE balance_monitoring_config 
SET is_enabled = true
WHERE is_enabled = false;

-- 3. Add shared credentials table if it doesn't exist
CREATE TABLE IF NOT EXISTS shared_mpesa_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL DEFAULT 'default_shared_credentials',
    consumer_key TEXT NOT NULL,
    consumer_secret TEXT NOT NULL,
    initiator_password TEXT NOT NULL,
    security_credential TEXT NOT NULL,
    initiator_name TEXT NOT NULL DEFAULT 'shared_initiator',
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
);

-- 4. Add column to partners table for shared credentials
ALTER TABLE partners ADD COLUMN IF NOT EXISTS use_shared_credentials BOOLEAN DEFAULT true;

-- 5. Create balance check logs table for debugging
CREATE TABLE IF NOT EXISTS balance_check_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    balance_amount DECIMAL(15,2),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_requests_partner_status ON balance_requests(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_balance_requests_updated_at ON balance_requests(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_check_logs_partner_triggered ON balance_check_logs(partner_id, triggered_at DESC);

-- 7. Insert default shared credentials (update with real values)
INSERT INTO shared_mpesa_credentials (
    name,
    consumer_key,
    consumer_secret,
    initiator_password,
    security_credential,
    initiator_name,
    environment,
    is_active
) VALUES (
    'default_shared_credentials',
    'YOUR_SHARED_CONSUMER_KEY',
    'YOUR_SHARED_CONSUMER_SECRET',
    'YOUR_SHARED_INITIATOR_PASSWORD',
    'YOUR_SHARED_SECURITY_CREDENTIAL',
    'shared_initiator',
    'sandbox',
    true
) ON CONFLICT (name) DO NOTHING;

-- 8. Create real-time balance function
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

-- 9. Create force balance check function
CREATE OR REPLACE FUNCTION force_balance_check(partner_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    partner_record RECORD;
BEGIN
    -- Get partner details
    SELECT id, name, mpesa_shortcode, mpesa_environment 
    INTO partner_record
    FROM partners 
    WHERE id = partner_uuid AND is_mpesa_configured = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Partner not found or M-Pesa not configured'
        );
    END IF;
    
    -- Update last checked time to force immediate check
    UPDATE balance_monitoring_config 
    SET last_checked_at = NOW() - INTERVAL '1 hour'
    WHERE partner_id = partner_uuid;
    
    -- Log the forced check
    INSERT INTO balance_check_logs (
        partner_id,
        action,
        triggered_at,
        metadata
    ) VALUES (
        partner_uuid,
        'force_check_triggered',
        NOW(),
        jsonb_build_object('partner_name', partner_record.name)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Balance check forced for partner: ' || partner_record.name,
        'partner_id', partner_uuid,
        'triggered_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 10. Create real-time balance dashboard view
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
-- MIGRATION COMPLETE
-- ==============================================
-- Key fixes applied:
-- ✅ Real-time checking (1-minute intervals)
-- ✅ Shared credentials support
-- ✅ Performance optimizations
-- ✅ Real-time dashboard view
-- ✅ Force check functionality
