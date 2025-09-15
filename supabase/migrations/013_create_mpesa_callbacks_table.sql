-- Create mpesa_callbacks table to store M-Pesa callback data
CREATE TABLE IF NOT EXISTS mpesa_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id),
    disbursement_id UUID REFERENCES disbursement_requests(id),
    callback_type TEXT NOT NULL CHECK (callback_type IN ('timeout', 'result')),
    conversation_id TEXT,
    originator_conversation_id TEXT,
    transaction_id TEXT,
    result_code TEXT,
    result_desc TEXT,
    receipt_number TEXT,
    transaction_amount DECIMAL(10,2),
    transaction_date TEXT,
    raw_callback_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mpesa_callbacks_conversation_id ON mpesa_callbacks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_callbacks_partner_id ON mpesa_callbacks(partner_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_callbacks_disbursement_id ON mpesa_callbacks(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_callbacks_created_at ON mpesa_callbacks(created_at);








