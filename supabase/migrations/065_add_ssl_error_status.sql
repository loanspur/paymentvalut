-- Add ssl_error status to webhook_delivery_logs delivery_status constraint
ALTER TABLE webhook_delivery_logs 
DROP CONSTRAINT IF EXISTS webhook_delivery_logs_delivery_status_check;

ALTER TABLE webhook_delivery_logs 
ADD CONSTRAINT webhook_delivery_logs_delivery_status_check 
CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'error', 'not_configured', 'not_ussd', 'ssl_error'));

-- Update the comment to reflect the new status
COMMENT ON COLUMN webhook_delivery_logs.delivery_status IS 'Status of webhook delivery: pending, delivered, failed, error, not_configured, not_ussd, ssl_error';
