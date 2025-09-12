-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create partners table
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disbursement_requests table
CREATE TABLE disbursement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin TEXT NOT NULL CHECK (origin IN ('ui', 'ussd')),
    tenant_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    client_request_id TEXT NOT NULL,
    msisdn TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'accepted', 'failed', 'success')),
    conversation_id TEXT,
    transaction_receipt TEXT,
    result_code TEXT,
    result_desc TEXT,
    partner_id UUID REFERENCES partners(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_request_id, partner_id)
);

-- Create disbursement_callbacks table
CREATE TABLE disbursement_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_disbursement_requests_status ON disbursement_requests(status);
CREATE INDEX idx_disbursement_requests_conversation_id ON disbursement_requests(conversation_id);
CREATE INDEX idx_disbursement_requests_client_request_id ON disbursement_requests(client_request_id);
CREATE INDEX idx_disbursement_callbacks_conversation_id ON disbursement_callbacks(conversation_id);
CREATE INDEX idx_partners_api_key_hash ON partners(api_key_hash);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disbursement_requests_updated_at BEFORE UPDATE ON disbursement_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

