-- Create balance_requests table for tracking M-Pesa balance inquiries
-- This table stores balance check requests and their results

CREATE TABLE IF NOT EXISTS balance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL UNIQUE,
    originator_conversation_id TEXT,
    transaction_id TEXT,
    
    -- Request details
    request_type VARCHAR(50) NOT NULL DEFAULT 'balance_inquiry', -- 'balance_inquiry', 'account_balance'
    shortcode TEXT NOT NULL,
    initiator_name TEXT NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'timeout')),
    result_code TEXT,
    result_desc TEXT,
    
    -- Balance information (populated by callback)
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    utility_account_balance DECIMAL(15,2),
    working_account_balance DECIMAL(15,2),
    charges_account_balance DECIMAL(15,2),
    
    -- M-Pesa API details
    mpesa_response JSONB,
    callback_received_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_balance_requests_partner_id ON balance_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_requests_conversation_id ON balance_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_balance_requests_status ON balance_requests(status);
CREATE INDEX IF NOT EXISTS idx_balance_requests_created_at ON balance_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_requests_partner_created ON balance_requests(partner_id, created_at);

-- Add comments
COMMENT ON TABLE balance_requests IS 'Tracks M-Pesa balance inquiry requests and their results';
COMMENT ON COLUMN balance_requests.conversation_id IS 'M-Pesa conversation ID for tracking the request';
COMMENT ON COLUMN balance_requests.status IS 'Current status of the balance request';
COMMENT ON COLUMN balance_requests.utility_account_balance IS 'Utility account balance from M-Pesa callback';
COMMENT ON COLUMN balance_requests.working_account_balance IS 'Working account balance from M-Pesa callback';
COMMENT ON COLUMN balance_requests.charges_account_balance IS 'Charges account balance from M-Pesa callback';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_balance_requests_updated_at
    BEFORE UPDATE ON balance_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_requests_updated_at();
