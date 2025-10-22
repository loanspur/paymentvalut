-- Create loan tracking table to monitor approved loans and disbursement progress
CREATE TABLE IF NOT EXISTS loan_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    loan_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    client_name VARCHAR(255),
    phone_number VARCHAR(20),
    loan_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    disbursement_id UUID REFERENCES disbursement_requests(id),
    disbursement_status VARCHAR(50),
    mpesa_receipt_number VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, loan_id)
);

-- Add comments
COMMENT ON TABLE loan_tracking IS 'Tracks approved loans and their disbursement progress';
COMMENT ON COLUMN loan_tracking.loan_id IS 'Mifos X loan ID';
COMMENT ON COLUMN loan_tracking.client_id IS 'Mifos X client ID';
COMMENT ON COLUMN loan_tracking.status IS 'Current status: pending, approved, disbursed, failed';
COMMENT ON COLUMN loan_tracking.disbursement_status IS 'M-Pesa disbursement status';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_loan_tracking_partner ON loan_tracking(partner_id);
CREATE INDEX IF NOT EXISTS idx_loan_tracking_loan_id ON loan_tracking(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_tracking_status ON loan_tracking(status);
CREATE INDEX IF NOT EXISTS idx_loan_tracking_created_at ON loan_tracking(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_loan_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_loan_tracking_updated_at ON loan_tracking;
CREATE TRIGGER update_loan_tracking_updated_at
    BEFORE UPDATE ON loan_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_loan_tracking_updated_at();

-- Verification query
SELECT 
    'loan_tracking' as table_name,
    COUNT(*) as record_count
FROM loan_tracking;
