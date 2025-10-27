-- Enhanced Duplicate Prevention Indexes
-- This migration adds indexes to support the new duplicate prevention checks

-- Add composite index for same phone number + amount + partner within time window
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_duplicate_check_24h 
ON disbursement_requests (msisdn, amount, partner_id, created_at DESC);

-- Add composite index for same phone number + partner within 1 hour
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_duplicate_check_1h 
ON disbursement_requests (msisdn, partner_id, created_at DESC);

-- Add index for client_request_id + partner_id (already exists but ensure it's optimized)
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_client_request_partner 
ON disbursement_requests (client_request_id, partner_id);

-- Add index for status + created_at for monitoring recent transactions
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_status_created 
ON disbursement_requests (status, created_at DESC);

-- Add index for conversation_id for callback matching
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_conversation_id 
ON disbursement_requests (conversation_id);

-- Add index for msisdn + created_at for phone number tracking
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_msisdn_created 
ON disbursement_requests (msisdn, created_at DESC);

-- Add index for partner_id + created_at for partner transaction monitoring
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_partner_created 
ON disbursement_requests (partner_id, created_at DESC);

-- Add index for amount + created_at for amount-based duplicate detection
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_amount_created 
ON disbursement_requests (amount, created_at DESC);

-- Create a function to clean up old duplicate prevention logs (optional)
CREATE OR REPLACE FUNCTION cleanup_old_duplicate_logs()
RETURNS void AS $$
BEGIN
  -- Delete disbursement blocks older than 7 days
  DELETE FROM disbursement_blocks 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete webhook delivery logs older than 30 days
  DELETE FROM webhook_delivery_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete mpesa callbacks older than 90 days
  DELETE FROM mpesa_callbacks 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a view for monitoring duplicate prevention effectiveness
CREATE OR REPLACE VIEW duplicate_prevention_stats AS
SELECT 
  DATE(created_at) as date,
  partner_id,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_requests,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
  COUNT(CASE WHEN result_code LIKE 'DUPLICATE_%' THEN 1 END) as duplicate_blocks,
  COUNT(CASE WHEN result_code = 'B2C_1005' THEN 1 END) as json_parse_errors,
  COUNT(CASE WHEN result_code = 'B2C_1006' THEN 1 END) as http_errors,
  COUNT(CASE WHEN result_code = 'B2C_1007' THEN 1 END) as invalid_response_errors
FROM disbursement_requests 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), partner_id
ORDER BY date DESC, partner_id;

-- Add comment explaining the indexes
COMMENT ON INDEX idx_disbursement_requests_duplicate_check_24h IS 'Index for 24-hour duplicate prevention: same phone + amount + partner';
COMMENT ON INDEX idx_disbursement_requests_duplicate_check_1h IS 'Index for 1-hour rate limiting: same phone + partner';
COMMENT ON INDEX idx_disbursement_requests_client_request_partner IS 'Index for idempotency check: client_request_id + partner';
COMMENT ON INDEX idx_disbursement_requests_status_created IS 'Index for monitoring transaction status over time';
COMMENT ON INDEX idx_disbursement_requests_conversation_id IS 'Index for M-Pesa callback matching';
COMMENT ON INDEX idx_disbursement_requests_msisdn_created IS 'Index for phone number transaction history';
COMMENT ON INDEX idx_disbursement_requests_partner_created IS 'Index for partner transaction monitoring';
COMMENT ON INDEX idx_disbursement_requests_amount_created IS 'Index for amount-based duplicate detection';

-- Add comment for the cleanup function
COMMENT ON FUNCTION cleanup_old_duplicate_logs() IS 'Cleans up old duplicate prevention logs to maintain database performance';

-- Add comment for the monitoring view
COMMENT ON VIEW duplicate_prevention_stats IS 'Provides statistics on duplicate prevention effectiveness and error rates';










