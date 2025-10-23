-- Final fix for the get_disbursements_for_retry function
-- The issue is with data type mismatches in the return table

DROP FUNCTION IF EXISTS get_disbursements_for_retry();

CREATE OR REPLACE FUNCTION get_disbursements_for_retry()
RETURNS TABLE (
    id UUID,
    partner_id UUID,
    amount NUMERIC,
    msisdn TEXT,
    client_request_id TEXT,
    retry_count INTEGER,
    max_retries INTEGER,
    retry_reason TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    mpesa_response_code TEXT,
    mpesa_response_description TEXT,
    partner_name TEXT,
    partner_api_key TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.partner_id,
        dr.amount,
        dr.msisdn::TEXT,
        dr.client_request_id::TEXT,
        COALESCE(dr.retry_count, 0) as retry_count,
        COALESCE(dr.max_retries, 3) as max_retries,
        dr.retry_reason,
        dr.next_retry_at,
        dr.status::TEXT,
        dr.result_code::TEXT,
        dr.result_desc::TEXT,
        p.name::TEXT as partner_name,
        p.api_key::TEXT as partner_api_key
    FROM disbursement_requests dr
    JOIN partners p ON dr.partner_id = p.id
    WHERE dr.status IN ('failed', 'pending')
    AND COALESCE(dr.retry_count, 0) < COALESCE(dr.max_retries, 3)
    AND (dr.next_retry_at IS NULL OR dr.next_retry_at <= NOW())
    AND should_retry_disbursement(
        dr.status, 
        COALESCE(dr.retry_count, 0), 
        COALESCE(dr.max_retries, 3), 
        dr.result_code
    )
    ORDER BY dr.next_retry_at ASC NULLS LAST, dr.created_at ASC;
END;
$$ LANGUAGE plpgsql;

