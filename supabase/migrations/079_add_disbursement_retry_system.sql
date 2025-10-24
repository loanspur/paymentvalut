-- Add retry mechanism fields to disbursement_requests table
ALTER TABLE disbursement_requests
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS retry_reason TEXT,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retry_history JSONB DEFAULT '[]';

-- Add indexes for retry mechanism performance
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_retry_count ON disbursement_requests(retry_count);
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_next_retry_at ON disbursement_requests(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_status_retry ON disbursement_requests(status, retry_count, next_retry_at);

-- Create disbursement_retry_logs table for detailed retry tracking
CREATE TABLE IF NOT EXISTS disbursement_retry_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disbursement_id UUID NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
    retry_attempt INTEGER NOT NULL,
    retry_reason TEXT NOT NULL,
    mpesa_response_code VARCHAR(10),
    mpesa_response_description TEXT,
    error_details JSONB DEFAULT '{}',
    retry_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for retry logs
CREATE INDEX IF NOT EXISTS idx_disbursement_retry_logs_disbursement_id ON disbursement_retry_logs(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_retry_logs_retry_attempt ON disbursement_retry_logs(retry_attempt);
CREATE INDEX IF NOT EXISTS idx_disbursement_retry_logs_retry_timestamp ON disbursement_retry_logs(retry_timestamp);

-- Add trigger for updated_at on disbursement_requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_disbursement_requests_updated_at') THEN
        CREATE TRIGGER set_disbursement_requests_updated_at
        BEFORE UPDATE ON disbursement_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create function to calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION calculate_next_retry_time(
    retry_count INTEGER,
    base_delay_minutes INTEGER DEFAULT 5
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Exponential backoff: 5min, 15min, 45min, 135min (max 2.25 hours)
    -- Formula: base_delay * (3 ^ retry_count)
    DECLARE
        delay_minutes INTEGER;
    BEGIN
        delay_minutes := base_delay_minutes * POWER(3, retry_count);
        
        -- Cap at 2.25 hours (135 minutes)
        IF delay_minutes > 135 THEN
            delay_minutes := 135;
        END IF;
        
        RETURN NOW() + (delay_minutes || ' minutes')::INTERVAL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create function to determine if disbursement should be retried
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
        '1',    -- Insufficient funds
        '2',    -- Less than minimum transaction value
        '3',    -- More than maximum transaction value
        '4',    -- Would exceed daily transfer limit
        '5',    -- Would exceed minimum balance
        '6',    -- Unresolved primary party
        '7',    -- Unresolved receiver party
        '8',    -- Would exceed maximum balance
        '9',    -- Transfer limit exceeded
        '10',   -- Duplicate transaction
        '11',   -- Invalid amount
        '12',   -- Invalid receiver party
        '13',   -- Invalid initiator party
        '14',   -- Invalid security credential
        '15',   -- Invalid transaction type
        '16',   -- Invalid shortcode
        '17',   -- Invalid reference
        '18',   -- Invalid time format
        '19',   -- Invalid transaction ID
        '20',   -- Invalid encryption
        '21',   -- Invalid certificate
        '22',   -- Invalid signature
        '23',   -- Invalid public key
        '24',   -- Invalid private key
        '25',   -- Invalid certificate
        '26',   -- Invalid transaction
        '27',   -- Invalid amount
        '28',   -- Invalid receiver
        '29',   -- Invalid initiator
        '30',   -- Invalid security credential
        '31',   -- Invalid transaction type
        '32',   -- Invalid shortcode
        '33',   -- Invalid reference
        '34',   -- Invalid time format
        '35',   -- Invalid transaction ID
        '36',   -- Invalid encryption
        '37',   -- Invalid certificate
        '38',   -- Invalid signature
        '39',   -- Invalid public key
        '40',   -- Invalid private key
        '41',   -- Invalid certificate
        '42',   -- Invalid transaction
        '43',   -- Invalid amount
        '44',   -- Invalid receiver
        '45',   -- Invalid initiator
        '46',   -- Invalid security credential
        '47',   -- Invalid transaction type
        '48',   -- Invalid shortcode
        '49',   -- Invalid reference
        '50'    -- Invalid time format
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Retry for temporary failures (network issues, service unavailable, etc.)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get disbursements ready for retry
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
        dr.retry_count,
        dr.max_retries,
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
    AND dr.retry_count < dr.max_retries
    AND dr.next_retry_at <= NOW()
    AND should_retry_disbursement(
        dr.status, 
        dr.retry_count, 
        dr.max_retries, 
        dr.result_code
    )
    ORDER BY dr.next_retry_at ASC, dr.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert default retry configuration for existing disbursements
UPDATE disbursement_requests 
SET 
    retry_count = 0,
    max_retries = 3,
    retry_reason = CASE 
        WHEN status = 'failed' THEN 'Initial failure - ready for retry'
        WHEN status = 'pending' THEN 'Pending disbursement - ready for retry'
        ELSE NULL
    END,
    next_retry_at = CASE 
        WHEN status IN ('failed', 'pending') THEN calculate_next_retry_time(0)
        ELSE NULL
    END
WHERE retry_count IS NULL;

-- Add comment explaining the retry system
COMMENT ON TABLE disbursement_retry_logs IS 'Logs all retry attempts for failed disbursements with detailed error information';
COMMENT ON FUNCTION calculate_next_retry_time IS 'Calculates next retry time using exponential backoff strategy';
COMMENT ON FUNCTION should_retry_disbursement IS 'Determines if a disbursement should be retried based on status, retry count, and M-Pesa response code';
COMMENT ON FUNCTION get_disbursements_for_retry IS 'Returns disbursements that are ready for retry based on retry schedule and eligibility';


