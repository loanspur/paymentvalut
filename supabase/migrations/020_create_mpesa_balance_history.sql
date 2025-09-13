-- Create M-Pesa balance history table
-- This will track balance changes over time for monitoring and analytics

CREATE TABLE IF NOT EXISTS mpesa_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    disbursement_id UUID REFERENCES disbursement_requests(id) ON DELETE SET NULL,
    balance_type VARCHAR(50) NOT NULL, -- 'working', 'utility', 'charges', 'total'
    balance_amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'disbursement', 'callback', 'manual'
    transaction_reference VARCHAR(255), -- conversation_id, transaction_id, or manual reference
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    change_amount DECIMAL(15,2) GENERATED ALWAYS AS (balance_after - balance_before) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mpesa_balance_history_partner_id ON mpesa_balance_history(partner_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_balance_history_disbursement_id ON mpesa_balance_history(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_balance_history_balance_type ON mpesa_balance_history(balance_type);
CREATE INDEX IF NOT EXISTS idx_mpesa_balance_history_created_at ON mpesa_balance_history(created_at);
CREATE INDEX IF NOT EXISTS idx_mpesa_balance_history_partner_created ON mpesa_balance_history(partner_id, created_at);

-- Add comments
COMMENT ON TABLE mpesa_balance_history IS 'Tracks M-Pesa account balance changes over time';
COMMENT ON COLUMN mpesa_balance_history.balance_type IS 'Type of account: working, utility, charges, or total';
COMMENT ON COLUMN mpesa_balance_history.transaction_type IS 'Type of transaction that caused balance change';
COMMENT ON COLUMN mpesa_balance_history.change_amount IS 'Calculated change in balance (after - before)';





