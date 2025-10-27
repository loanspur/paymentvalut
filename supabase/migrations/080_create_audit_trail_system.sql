-- Create comprehensive audit trail system
-- This migration creates basic tables for tracking all system activities

-- 1. Create audit_logs table for general system activities
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Request Information
    request_id TEXT,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    user_agent TEXT,
    origin_ip INET,
    referer TEXT,
    
    -- User Information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    
    -- Partner Information
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    partner_name TEXT,
    
    -- Action Information
    action_type TEXT NOT NULL,
    action_category TEXT NOT NULL,
    action_description TEXT NOT NULL,
    
    -- Request/Response Data
    request_data JSONB,
    response_data JSONB,
    response_status INTEGER,
    
    -- Additional Context
    session_id TEXT,
    correlation_id TEXT,
    duration_ms INTEGER,
    
    -- Metadata
    metadata JSONB,
    severity TEXT DEFAULT 'info',
    
    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create api_requests table for detailed API tracking
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Request Details
    request_id TEXT UNIQUE,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    query_params JSONB,
    headers JSONB,
    body JSONB,
    
    -- Network Information
    origin_ip INET NOT NULL,
    user_agent TEXT,
    referer TEXT,
    forwarded_for TEXT,
    
    -- Authentication
    api_key_hash TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    
    -- Response Information
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    response_size_bytes INTEGER,
    
    -- Performance Metrics
    duration_ms INTEGER,
    memory_usage_mb DECIMAL(10,2),
    
    -- Error Information
    error_message TEXT,
    error_stack TEXT,
    error_code TEXT,
    
    -- Additional Context
    session_id TEXT,
    correlation_id TEXT,
    request_source TEXT,
    
    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_activities table for user-specific actions
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User Information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_role TEXT,
    
    -- Activity Details
    activity_type TEXT NOT NULL,
    activity_category TEXT NOT NULL,
    activity_description TEXT NOT NULL,
    
    -- Target Information
    target_type TEXT,
    target_id UUID,
    target_name TEXT,
    
    -- Changes (for update/delete operations)
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Additional Data
    metadata JSONB,
    severity TEXT DEFAULT 'info',
    
    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create system_events table for system-level events
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Event Information
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    event_description TEXT NOT NULL,
    
    -- Source Information
    source_component TEXT,
    source_function TEXT,
    source_file TEXT,
    
    -- Event Data
    event_data JSONB,
    error_details JSONB,
    
    -- Context
    correlation_id TEXT,
    session_id TEXT,
    
    -- Severity and Impact
    severity TEXT DEFAULT 'info',
    impact_level TEXT,
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partner_id ON audit_logs(partner_id);

CREATE INDEX IF NOT EXISTS idx_api_requests_timestamp ON api_requests(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON api_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_partner_id ON api_requests(partner_id);

CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(event_timestamp DESC);

-- 6. Create audit log function for easy logging
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action_type TEXT,
    p_action_category TEXT,
    p_action_description TEXT,
    p_user_id UUID DEFAULT NULL,
    p_partner_id UUID DEFAULT NULL,
    p_request_data JSONB DEFAULT NULL,
    p_response_data JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'info'
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_email TEXT;
    v_user_role TEXT;
    v_partner_name TEXT;
BEGIN
    -- Get user information if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT email, role INTO v_user_email, v_user_role
        FROM users WHERE id = p_user_id;
    END IF;
    
    -- Get partner information if partner_id provided
    IF p_partner_id IS NOT NULL THEN
        SELECT name INTO v_partner_name
        FROM partners WHERE id = p_partner_id;
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        action_type,
        action_category,
        action_description,
        user_id,
        user_email,
        user_role,
        partner_id,
        partner_name,
        request_data,
        response_data,
        metadata,
        severity
    ) VALUES (
        p_action_type,
        p_action_category,
        p_action_description,
        p_user_id,
        v_user_email,
        v_user_role,
        p_partner_id,
        v_partner_name,
        p_request_data,
        p_response_data,
        p_metadata,
        p_severity
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create API request logging function
CREATE OR REPLACE FUNCTION log_api_request(
    p_method TEXT,
    p_endpoint TEXT,
    p_origin_ip INET,
    p_user_agent TEXT DEFAULT NULL,
    p_headers JSONB DEFAULT NULL,
    p_body JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_partner_id UUID DEFAULT NULL,
    p_request_source TEXT DEFAULT 'api'
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_api_key_hash TEXT;
BEGIN
    -- Extract API key hash from headers if present
    IF p_headers IS NOT NULL AND p_headers ? 'x-api-key' THEN
        v_api_key_hash := encode(digest(p_headers->>'x-api-key', 'sha256'), 'hex');
    END IF;
    
    -- Insert API request log
    INSERT INTO api_requests (
        method,
        endpoint,
        origin_ip,
        user_agent,
        headers,
        body,
        user_id,
        partner_id,
        api_key_hash,
        request_source
    ) VALUES (
        p_method,
        p_endpoint,
        p_origin_ip,
        p_user_agent,
        p_headers,
        p_body,
        p_user_id,
        p_partner_id,
        v_api_key_hash,
        p_request_source
    ) RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create user activity logging function
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_category TEXT,
    p_activity_description TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_name TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
    v_user_email TEXT;
    v_user_role TEXT;
    v_changed_fields TEXT[];
BEGIN
    -- Get user information
    SELECT email, role INTO v_user_email, v_user_role
    FROM users WHERE id = p_user_id;
    
    -- Calculate changed fields if old and new values provided
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT ARRAY(
            SELECT key FROM jsonb_each(p_new_values)
            WHERE p_new_values->>key IS DISTINCT FROM p_old_values->>key
        ) INTO v_changed_fields;
    END IF;
    
    -- Insert user activity log
    INSERT INTO user_activities (
        user_id,
        user_email,
        user_role,
        activity_type,
        activity_category,
        activity_description,
        target_type,
        target_id,
        target_name,
        old_values,
        new_values,
        changed_fields,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        v_user_email,
        v_user_role,
        p_activity_type,
        p_activity_category,
        p_activity_description,
        p_target_type,
        p_target_id,
        p_target_name,
        p_old_values,
        p_new_values,
        v_changed_fields,
        p_ip_address,
        p_user_agent,
        p_metadata
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Create system event logging function
CREATE OR REPLACE FUNCTION log_system_event(
    p_event_type TEXT,
    p_event_category TEXT,
    p_event_description TEXT,
    p_source_component TEXT DEFAULT NULL,
    p_source_function TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT NULL,
    p_error_details JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'info',
    p_impact_level TEXT DEFAULT 'low'
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    -- Insert system event log
    INSERT INTO system_events (
        event_type,
        event_category,
        event_description,
        source_component,
        source_function,
        event_data,
        error_details,
        severity,
        impact_level
    ) VALUES (
        p_event_type,
        p_event_category,
        p_event_description,
        p_source_component,
        p_source_function,
        p_event_data,
        p_error_details,
        p_severity,
        p_impact_level
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create triggers for updated_at
CREATE TRIGGER update_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Create RLS policies for security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Allow super admins to view all audit logs
CREATE POLICY "Super admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Allow admins to view audit logs for their partner
CREATE POLICY "Admins can view partner audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'partner_admin')
            AND users.partner_id = audit_logs.partner_id
        )
    );

-- Similar policies for other tables
CREATE POLICY "Super admins can view all api requests" ON api_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Admins can view partner api requests" ON api_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'partner_admin')
            AND users.partner_id = api_requests.partner_id
        )
    );

CREATE POLICY "Super admins can view all user activities" ON user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Admins can view partner user activities" ON user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'partner_admin')
            AND EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = auth.uid() 
                AND u.partner_id = user_activities.partner_id
            )
        )
    );

CREATE POLICY "Super admins can view all system events" ON system_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- 13. Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE api_requests IS 'Detailed logging of all API requests and responses';
COMMENT ON TABLE user_activities IS 'User-specific activity tracking and changes';
COMMENT ON TABLE system_events IS 'System-level events, errors, and warnings';

COMMENT ON FUNCTION log_audit_event IS 'Log general audit events with user and partner context';
COMMENT ON FUNCTION log_api_request IS 'Log API requests with detailed request/response information';
COMMENT ON FUNCTION log_user_activity IS 'Log user activities with change tracking';
COMMENT ON FUNCTION log_system_event IS 'Log system events, errors, and warnings';