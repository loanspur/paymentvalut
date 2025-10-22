-- Comprehensive Investigation of Balance Check Flow and SafariCom Responses
-- This script will help trace the entire balance check process step by step

-- ==============================================
-- 1. CHECK PARTNER CONFIGURATION
-- ==============================================

SELECT 
    'PARTNER CONFIGURATION CHECK' as investigation_step,
    p.id,
    p.name,
    p.short_code,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.is_mpesa_configured,
    p.is_active,
    p.created_at,
    p.updated_at
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 2. CHECK BALANCE MONITORING CONFIGURATION
-- ==============================================

SELECT 
    'BALANCE MONITORING CONFIG CHECK' as investigation_step,
    p.name as partner_name,
    bmc.id,
    bmc.partner_id,
    bmc.working_account_threshold,
    bmc.utility_account_threshold,
    bmc.charges_account_threshold,
    bmc.check_interval_minutes,
    bmc.is_enabled,
    bmc.last_checked_at,
    bmc.created_at,
    bmc.updated_at
FROM balance_monitoring_config bmc
JOIN partners p ON bmc.partner_id = p.id
WHERE p.is_active = true
ORDER BY p.name;

-- ==============================================
-- 3. CHECK RECENT BALANCE REQUESTS (M-Pesa API Calls)
-- ==============================================

SELECT 
    'RECENT BALANCE REQUESTS' as investigation_step,
    p.name as partner_name,
    br.id,
    br.conversation_id,
    br.originator_conversation_id,
    br.transaction_id,
    br.status,
    br.result_code,
    br.result_desc,
    br.utility_account_balance,
    br.working_account_balance,
    br.charges_account_balance,
    br.balance_before,
    br.balance_after,
    br.created_at,
    br.updated_at,
    br.callback_received_at,
    CASE 
        WHEN br.callback_received_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (br.callback_received_at - br.created_at))::INTEGER
        ELSE NULL
    END as callback_delay_seconds
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '7 days'
ORDER BY br.created_at DESC
LIMIT 20;

-- ==============================================
-- 4. CHECK M-PESA RESPONSE DATA
-- ==============================================

SELECT 
    'M-PESA RESPONSE DATA' as investigation_step,
    p.name as partner_name,
    br.conversation_id,
    br.status,
    br.result_code,
    br.result_desc,
    br.mpesa_response,
    br.callback_received_at,
    CASE 
        WHEN br.mpesa_response IS NOT NULL THEN 'Has Response Data'
        ELSE 'No Response Data'
    END as response_status
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '7 days'
AND br.mpesa_response IS NOT NULL
ORDER BY br.created_at DESC
LIMIT 10;

-- ==============================================
-- 5. CHECK FOR FAILED BALANCE REQUESTS
-- ==============================================

SELECT 
    'FAILED BALANCE REQUESTS' as investigation_step,
    p.name as partner_name,
    br.conversation_id,
    br.status,
    br.result_code,
    br.result_desc,
    br.created_at,
    br.updated_at,
    br.callback_received_at,
    CASE 
        WHEN br.callback_received_at IS NULL AND br.created_at < NOW() - INTERVAL '5 minutes' THEN 'No Callback Received'
        WHEN br.status = 'failed' THEN 'Explicitly Failed'
        WHEN br.result_code IS NOT NULL AND br.result_code != '0' THEN 'M-Pesa Error Code'
        ELSE 'Other Issue'
    END as failure_reason
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '7 days'
AND (
    br.status = 'failed' 
    OR br.status = 'pending' 
    OR (br.result_code IS NOT NULL AND br.result_code != '0')
    OR (br.callback_received_at IS NULL AND br.created_at < NOW() - INTERVAL '5 minutes')
)
ORDER BY br.created_at DESC
LIMIT 15;

-- ==============================================
-- 6. CHECK BALANCE REQUEST TIMING ANALYSIS
-- ==============================================

SELECT 
    'BALANCE REQUEST TIMING ANALYSIS' as investigation_step,
    p.name as partner_name,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN br.status = 'completed' THEN 1 END) as completed_requests,
    COUNT(CASE WHEN br.status = 'failed' THEN 1 END) as failed_requests,
    COUNT(CASE WHEN br.status = 'pending' THEN 1 END) as pending_requests,
    AVG(CASE 
        WHEN br.callback_received_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (br.callback_received_at - br.created_at))::INTEGER
        ELSE NULL
    END) as avg_callback_delay_seconds,
    MAX(br.created_at) as last_request_time,
    MAX(CASE WHEN br.status = 'completed' THEN br.created_at END) as last_successful_request
FROM balance_requests br
JOIN partners p ON br.partner_id = p.id
WHERE br.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.name
ORDER BY p.name;

-- ==============================================
-- 7. CHECK SHARED M-PESA CREDENTIALS
-- ==============================================

SELECT 
    'SHARED M-PESA CREDENTIALS CHECK' as investigation_step,
    smc.id,
    smc.name,
    smc.environment,
    smc.initiator_name,
    CASE 
        WHEN smc.security_credential IS NOT NULL THEN 'Has Security Credential'
        ELSE 'No Security Credential'
    END as security_credential_status,
    CASE 
        WHEN smc.consumer_key IS NOT NULL THEN 'Has Consumer Key'
        ELSE 'No Consumer Key'
    END as consumer_key_status,
    CASE 
        WHEN smc.consumer_secret IS NOT NULL THEN 'Has Consumer Secret'
        ELSE 'No Consumer Secret'
    END as consumer_secret_status,
    smc.created_at,
    smc.updated_at
FROM shared_mpesa_credentials smc
ORDER BY smc.name;

-- ==============================================
-- 8. CHECK FOR RECENT BALANCE CHECKS (Legacy Table)
-- ==============================================

SELECT 
    'RECENT BALANCE CHECKS (LEGACY)' as investigation_step,
    p.name as partner_name,
    bc.id,
    bc.shortcode,
    bc.balance_amount,
    bc.balance_currency,
    bc.check_timestamp,
    bc.response_status,
    bc.error_message,
    bc.created_at
FROM balance_checks bc
JOIN partners p ON bc.partner_id = p.id
WHERE bc.created_at >= NOW() - INTERVAL '7 days'
ORDER BY bc.created_at DESC
LIMIT 10;

-- ==============================================
-- 9. SUMMARY OF BALANCE DATA AVAILABILITY
-- ==============================================

SELECT 
    'BALANCE DATA AVAILABILITY SUMMARY' as investigation_step,
    p.name as partner_name,
    p.mpesa_shortcode,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM balance_requests br 
            WHERE br.partner_id = p.id 
            AND br.status = 'completed' 
            AND br.utility_account_balance IS NOT NULL
            AND br.created_at >= NOW() - INTERVAL '24 hours'
        ) THEN 'Has Recent Balance Data'
        WHEN EXISTS (
            SELECT 1 FROM balance_requests br 
            WHERE br.partner_id = p.id 
            AND br.status = 'completed' 
            AND br.utility_account_balance IS NOT NULL
        ) THEN 'Has Old Balance Data'
        WHEN EXISTS (
            SELECT 1 FROM balance_requests br 
            WHERE br.partner_id = p.id 
            AND br.status = 'pending'
            AND br.created_at >= NOW() - INTERVAL '1 hour'
        ) THEN 'Pending Balance Check'
        WHEN EXISTS (
            SELECT 1 FROM balance_requests br 
            WHERE br.partner_id = p.id 
            AND br.status = 'failed'
            AND br.created_at >= NOW() - INTERVAL '24 hours'
        ) THEN 'Recent Failed Check'
        ELSE 'No Balance Data'
    END as balance_data_status,
    (
        SELECT MAX(br.created_at) 
        FROM balance_requests br 
        WHERE br.partner_id = p.id 
        AND br.status = 'completed'
    ) as last_successful_balance_check,
    (
        SELECT br.result_desc 
        FROM balance_requests br 
        WHERE br.partner_id = p.id 
        AND br.created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY br.created_at DESC 
        LIMIT 1
    ) as last_result_description
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

