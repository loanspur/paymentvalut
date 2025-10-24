-- Fix the get_disbursements_for_retry function
-- The issue is likely with the return table structure

DROP FUNCTION IF EXISTS get_disbursements_for_retry();

-- Recreate the function with correct return structure
CREATE OR REPLACE FUNCTION get_disbursements_for_retry()
RETURNS TABLE (
    id UUID,
    partner_id UUID,
    amount NUMERIC,
    msisdn VARCHAR(20),
    client_request_id VARCHAR(255),
    retry_count INTEGER,
    max_retries INTEGER,
    retry_reason TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    mpesa_response_code VARCHAR(10),
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
        dr.msisdn,
        dr.client_request_id,
        COALESCE(dr.retry_count, 0) as retry_count,
        COALESCE(dr.max_retries, 3) as max_retries,
        dr.retry_reason,
        dr.next_retry_at,
        dr.status,
        dr.result_code,
        dr.result_desc,
        p.name as partner_name,
        p.api_key as partner_api_key
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

-- Also fix the should_retry_disbursement function to handle NULL values better
CREATE OR REPLACE FUNCTION should_retry_disbursement(
    p_status VARCHAR(50),
    p_retry_count INTEGER,
    p_max_retries INTEGER DEFAULT 3,
    p_mpesa_response_code VARCHAR(10) DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Don't retry if already successful
    IF p_status = 'success' THEN
        RETURN FALSE;
    END IF;
    
    -- Don't retry if max retries exceeded
    IF p_retry_count >= p_max_retries THEN
        RETURN FALSE;
    END IF;
    
    -- Don't retry certain M-Pesa error codes that are permanent failures
    IF p_mpesa_response_code IN (
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
        '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
        '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
        '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Retry for temporary failures (network issues, service unavailable, etc.)
    -- Also retry if response code is NULL (unknown error)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update existing disbursements to have proper retry settings
UPDATE disbursement_requests 
SET 
    retry_count = COALESCE(retry_count, 0),
    max_retries = COALESCE(max_retries, 3),
    retry_reason = CASE 
        WHEN status = 'failed' AND retry_reason IS NULL THEN 'Initial failure - ready for retry'
        WHEN status = 'pending' AND retry_reason IS NULL THEN 'Pending disbursement - ready for retry'
        ELSE retry_reason
    END,
    next_retry_at = CASE 
        WHEN status IN ('failed', 'pending') AND next_retry_at IS NULL THEN calculate_next_retry_time(0)
        ELSE next_retry_at
    END
WHERE retry_count IS NULL OR max_retries IS NULL OR retry_reason IS NULL OR next_retry_at IS NULL;


