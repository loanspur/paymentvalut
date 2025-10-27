-- Create webhook_delivery_logs table to track webhook delivery attempts
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disbursement_id UUID REFERENCES disbursement_requests(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    webhook_payload JSONB NOT NULL,
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'error', 'not_configured', 'not_ussd')),
    http_status_code INTEGER,
    error_message TEXT,
    response_body TEXT,
    delivery_attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_disbursement_id ON webhook_delivery_logs(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_delivery_status ON webhook_delivery_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_created_at ON webhook_delivery_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_delivery_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_webhook_delivery_logs_updated_at
    BEFORE UPDATE ON webhook_delivery_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_delivery_logs_updated_at();

-- Add comments
COMMENT ON TABLE webhook_delivery_logs IS 'Tracks webhook delivery attempts to external systems';
COMMENT ON COLUMN webhook_delivery_logs.delivery_status IS 'Status of webhook delivery: pending, delivered, failed, error, not_configured, not_ussd';
COMMENT ON COLUMN webhook_delivery_logs.delivery_attempts IS 'Number of delivery attempts made';
COMMENT ON COLUMN webhook_delivery_logs.response_body IS 'Response body from webhook endpoint';

