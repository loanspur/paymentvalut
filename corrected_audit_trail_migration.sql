-- Corrected Audit Trail Migration
-- This migration handles the actual table structure with required columns

-- 1. Create api_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Request Details
    request_id TEXT UNIQUE,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    path TEXT,
    query_params JSONB,
    request_headers JSONB,
    request_body JSONB,
    
    -- Response Details
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    response_time_ms INTEGER,
    
    -- Origin & User
    origin_ip INET,
    user_agent TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    partner_name TEXT,
    
    -- Source
    request_source TEXT, -- 'frontend', 'webhook', 'internal_api', 'cli'
    
    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create system_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Event Information
    event_type TEXT NOT NULL, -- 'startup', 'shutdown', 'error', 'warning', 'info', 'maintenance'
    event_category TEXT NOT NULL, -- 'system', 'database', 'api', 'external_service', 'security'
    event_description TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    source_component TEXT, -- 'auth_service', 'disbursement_engine', 'cron_job', 'database'
    metadata JSONB,
    
    -- Context
    host_name TEXT,
    process_id INTEGER,
    
    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance (with existence checks)
DO $$
BEGIN
    -- Create indexes for api_requests
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_event_timestamp') THEN
        CREATE INDEX idx_api_requests_event_timestamp ON api_requests(event_timestamp DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_user_id') THEN
        CREATE INDEX idx_api_requests_user_id ON api_requests(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_partner_id') THEN
        CREATE INDEX idx_api_requests_partner_id ON api_requests(partner_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_endpoint') THEN
        CREATE INDEX idx_api_requests_endpoint ON api_requests(endpoint);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_method') THEN
        CREATE INDEX idx_api_requests_method ON api_requests(method);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_origin_ip') THEN
        CREATE INDEX idx_api_requests_origin_ip ON api_requests(origin_ip);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_response_status') THEN
        CREATE INDEX idx_api_requests_response_status ON api_requests(response_status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_requests_request_source') THEN
        CREATE INDEX idx_api_requests_request_source ON api_requests(request_source);
    END IF;
    
    -- Create indexes for system_events
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_events_event_timestamp') THEN
        CREATE INDEX idx_system_events_event_timestamp ON system_events(event_timestamp DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_events_event_type') THEN
        CREATE INDEX idx_system_events_event_type ON system_events(event_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_events_event_category') THEN
        CREATE INDEX idx_system_events_event_category ON system_events(event_category);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_events_severity') THEN
        CREATE INDEX idx_system_events_severity ON system_events(severity);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_events_source_component') THEN
        CREATE INDEX idx_system_events_source_component ON system_events(source_component);
    END IF;
END $$;

-- 4. Create functions with correct column names

-- Function for audit_logs table
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        action, resource_type, resource_id, old_values, new_values,
        user_id, ip_address, user_agent
    ) VALUES (
        p_action, p_resource_type, p_resource_id, p_old_values, p_new_values,
        p_user_id, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Function for user_activities table (with required resource column)
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action TEXT,
    p_resource TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activities (
        user_id, action, resource, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_resource, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Function for api_requests table
CREATE OR REPLACE FUNCTION log_api_request(
    p_request_id TEXT,
    p_method TEXT,
    p_endpoint TEXT,
    p_path TEXT,
    p_query_params JSONB,
    p_request_headers JSONB,
    p_request_body JSONB,
    p_response_status INTEGER,
    p_response_headers JSONB,
    p_response_body JSONB,
    p_response_time_ms INTEGER,
    p_origin_ip INET,
    p_user_agent TEXT,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_partner_id UUID DEFAULT NULL,
    p_partner_name TEXT DEFAULT NULL,
    p_request_source TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_requests (
        request_id, method, endpoint, path, query_params, request_headers, request_body,
        response_status, response_headers, response_body, response_time_ms,
        origin_ip, user_agent, user_id, user_email, partner_id, partner_name, request_source
    ) VALUES (
        p_request_id, p_method, p_endpoint, p_path, p_query_params, p_request_headers, p_request_body,
        p_response_status, p_response_headers, p_response_body, p_response_time_ms,
        p_origin_ip, p_user_agent, p_user_id, p_user_email, p_partner_id, p_partner_name, p_request_source
    );
END;
$$ LANGUAGE plpgsql;

-- Function for system_events table
CREATE OR REPLACE FUNCTION log_system_event(
    p_event_type TEXT,
    p_event_category TEXT,
    p_event_description TEXT,
    p_severity TEXT,
    p_source_component TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_host_name TEXT DEFAULT NULL,
    p_process_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_events (
        event_type, event_category, event_description, severity,
        source_component, metadata, host_name, process_id
    ) VALUES (
        p_event_type, p_event_category, p_event_description, p_severity,
        p_source_component, p_metadata, p_host_name, p_process_id
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Add comments to the functions
COMMENT ON FUNCTION log_audit_event IS 'Log a general audit event into the audit_logs table';
COMMENT ON FUNCTION log_user_activity IS 'Log user-specific actions and activities';
COMMENT ON FUNCTION log_api_request IS 'Log detailed API request and response information';
COMMENT ON FUNCTION log_system_event IS 'Log system events, errors, and warnings';

-- 6. Test the functions with sample data (using valid user_id and required columns)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a valid user_id from the users table
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- If no user exists, create a test user or skip the test
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in database, skipping user_activity test';
    ELSE
        -- Test log_user_activity function with valid user_id and required resource column
        PERFORM log_user_activity(
            test_user_id,
            'User login',
            'authentication',
            '127.0.0.1'::inet,
            'Test User Agent'
        );
        RAISE NOTICE 'Tested log_user_activity function with user_id: %', test_user_id;
    END IF;
    
    -- Test log_audit_event function if audit_logs table has required columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND table_schema = 'public'
        AND column_name IN ('action', 'resource_type', 'user_id', 'ip_address')
    ) THEN
        PERFORM log_audit_event(
            'User login successful',
            'authentication',
            NULL,
            NULL,
            '{"login_time": "2024-01-01T12:00:00Z"}'::jsonb,
            test_user_id,
            '127.0.0.1'::inet,
            'Test User Agent'
        );
        RAISE NOTICE 'Tested log_audit_event function';
    END IF;
    
    -- Test log_api_request function
    PERFORM log_api_request(
        'test-api-request-123',
        'POST',
        '/api/test',
        '/api/test',
        '{"param": "value"}'::jsonb,
        '{"Content-Type": "application/json"}'::jsonb,
        '{"test": "body"}'::jsonb,
        200,
        '{"Content-Type": "application/json"}'::jsonb,
        '{"success": true}'::jsonb,
        150,
        '127.0.0.1'::inet,
        'Test User Agent',
        test_user_id,
        'test@example.com',
        NULL,
        'Test Partner',
        'frontend'
    );
    RAISE NOTICE 'Tested log_api_request function';
    
    -- Test log_system_event function
    PERFORM log_system_event(
        'test_event',
        'test_category',
        'Test system event',
        'low',
        'test_component',
        '{"test": "data"}'::jsonb,
        'test-host',
        12345
    );
    RAISE NOTICE 'Tested log_system_event function';
    
    RAISE NOTICE 'All available audit trail functions tested successfully!';
END $$;

-- 7. Verify tables and data
SELECT 'audit_logs' as table_name, COUNT(*) as record_count FROM audit_logs
UNION ALL
SELECT 'api_requests' as table_name, COUNT(*) as record_count FROM api_requests
UNION ALL
SELECT 'user_activities' as table_name, COUNT(*) as record_count FROM user_activities
UNION ALL
SELECT 'system_events' as table_name, COUNT(*) as record_count FROM system_events;

-- 8. Show sample data
SELECT 'Sample audit_logs:' as info;
SELECT action, resource_type, ip_address, created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 'Sample user_activities:' as info;
SELECT action, resource, ip_address, created_at 
FROM user_activities 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 'Sample api_requests:' as info;
SELECT method, endpoint, response_status, user_email, created_at 
FROM api_requests 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 'Sample system_events:' as info;
SELECT event_type, event_description, severity, created_at 
FROM system_events 
ORDER BY created_at DESC 
LIMIT 3;

