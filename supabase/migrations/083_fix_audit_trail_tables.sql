-- Fix audit trail system - add missing tables and functions
-- This migration adds the missing api_requests and system_events tables
-- and creates the logging functions

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

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_requests_event_timestamp ON api_requests(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON api_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_partner_id ON api_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON api_requests(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_requests_method ON api_requests(method);
CREATE INDEX IF NOT EXISTS idx_api_requests_origin_ip ON api_requests(origin_ip);
CREATE INDEX IF NOT EXISTS idx_api_requests_response_status ON api_requests(response_status);
CREATE INDEX IF NOT EXISTS idx_api_requests_request_source ON api_requests(request_source);

CREATE INDEX IF NOT EXISTS idx_system_events_event_timestamp ON system_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_event_category ON system_events(event_category);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_source_component ON system_events(source_component);

-- 4. Create audit log functions
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action_type TEXT,
    p_action_category TEXT,
    p_action_description TEXT,
    p_status TEXT,
    p_severity TEXT,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_partner_id UUID DEFAULT NULL,
    p_partner_name TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_method TEXT DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL,
    p_origin_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_source_component TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        action_type, action_category, action_description, status, severity,
        user_id, user_email, partner_id, partner_name,
        request_id, method, endpoint, origin_ip, user_agent,
        target_type, target_id, old_value, new_value,
        error_code, error_message, source_component, metadata
    ) VALUES (
        p_action_type, p_action_category, p_action_description, p_status, p_severity,
        p_user_id, p_user_email, p_partner_id, p_partner_name,
        p_request_id, p_method, p_endpoint, p_origin_ip, p_user_agent,
        p_target_type, p_target_id, p_old_value, p_new_value,
        p_error_code, p_error_message, p_source_component, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_user_email TEXT,
    p_activity_type TEXT,
    p_activity_category TEXT,
    p_activity_description TEXT,
    p_partner_id UUID DEFAULT NULL,
    p_partner_name TEXT DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activities (
        user_id, user_email, activity_type, activity_category, activity_description,
        partner_id, partner_name, target_type, target_id, old_value, new_value,
        ip_address, user_agent, session_id
    ) VALUES (
        p_user_id, p_user_email, p_activity_type, p_activity_category, p_activity_description,
        p_partner_id, p_partner_name, p_target_type, p_target_id, p_old_value, p_new_value,
        p_ip_address, p_user_agent, p_session_id
    );
END;
$$ LANGUAGE plpgsql;

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

-- Add comments to the functions
COMMENT ON FUNCTION log_audit_event IS 'Log a general audit event into the audit_logs table';
COMMENT ON FUNCTION log_api_request IS 'Log detailed API request and response information';
COMMENT ON FUNCTION log_user_activity IS 'Log user-specific actions and activities';
COMMENT ON FUNCTION log_system_event IS 'Log system events, errors, and warnings';




