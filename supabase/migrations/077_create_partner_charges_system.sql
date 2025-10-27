-- Create partner charges configuration table
CREATE TABLE IF NOT EXISTS partner_charges_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    charge_type VARCHAR(50) NOT NULL, -- 'disbursement', 'float_purchase', 'top_up', 'manual_allocation'
    charge_name VARCHAR(100) NOT NULL, -- 'M-Pesa B2C Fee', 'Float Purchase Fee', etc.
    charge_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    charge_percentage DECIMAL(5,2) DEFAULT NULL, -- Optional percentage-based charge
    minimum_charge DECIMAL(10,2) DEFAULT NULL, -- Minimum charge amount
    maximum_charge DECIMAL(10,2) DEFAULT NULL, -- Maximum charge amount
    is_active BOOLEAN DEFAULT true,
    is_automatic BOOLEAN DEFAULT true, -- Whether to automatically deduct from wallet
    charge_frequency VARCHAR(20) DEFAULT 'per_transaction', -- 'per_transaction', 'daily', 'monthly'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique charge type per partner
    UNIQUE(partner_id, charge_type)
);

-- Create partner charge transactions table
CREATE TABLE IF NOT EXISTS partner_charge_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES partner_wallets(id) ON DELETE CASCADE,
    charge_config_id UUID NOT NULL REFERENCES partner_charges_config(id) ON DELETE CASCADE,
    related_transaction_id UUID, -- Reference to the transaction that triggered this charge
    related_transaction_type VARCHAR(50), -- 'disbursement', 'float_purchase', etc.
    charge_amount DECIMAL(10,2) NOT NULL,
    charge_type VARCHAR(50) NOT NULL,
    charge_name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    wallet_balance_before DECIMAL(10,2) NOT NULL,
    wallet_balance_after DECIMAL(10,2) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partner_charges_config_partner_id ON partner_charges_config(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_charges_config_charge_type ON partner_charges_config(charge_type);
CREATE INDEX IF NOT EXISTS idx_partner_charges_config_active ON partner_charges_config(is_active);

CREATE INDEX IF NOT EXISTS idx_partner_charge_transactions_partner_id ON partner_charge_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_charge_transactions_wallet_id ON partner_charge_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_partner_charge_transactions_charge_config_id ON partner_charge_transactions(charge_config_id);
CREATE INDEX IF NOT EXISTS idx_partner_charge_transactions_related_transaction ON partner_charge_transactions(related_transaction_id, related_transaction_type);
CREATE INDEX IF NOT EXISTS idx_partner_charge_transactions_status ON partner_charge_transactions(status);
CREATE INDEX IF NOT EXISTS idx_partner_charge_transactions_created_at ON partner_charge_transactions(created_at);

-- Create updated_at trigger for partner_charges_config
CREATE OR REPLACE FUNCTION update_partner_charges_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_partner_charges_config_updated_at'
    ) THEN
        CREATE TRIGGER update_partner_charges_config_updated_at
            BEFORE UPDATE ON partner_charges_config
            FOR EACH ROW
            EXECUTE FUNCTION update_partner_charges_config_updated_at();
    END IF;
END $$;

-- Create updated_at trigger for partner_charge_transactions
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_partner_charge_transactions_updated_at'
    ) THEN
        CREATE TRIGGER update_partner_charge_transactions_updated_at
            BEFORE UPDATE ON partner_charge_transactions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default charge configurations for existing partners
INSERT INTO partner_charges_config (partner_id, charge_type, charge_name, charge_amount, description)
SELECT 
    p.id,
    'disbursement',
    'M-Pesa B2C Disbursement Fee',
    50.00,
    'Standard fee for M-Pesa B2C disbursement transactions'
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, charge_type) DO NOTHING;

INSERT INTO partner_charges_config (partner_id, charge_type, charge_name, charge_amount, description)
SELECT 
    p.id,
    'float_purchase',
    'B2C Float Purchase Fee',
    25.00,
    'Fee for purchasing B2C float from NCBA'
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, charge_type) DO NOTHING;

INSERT INTO partner_charges_config (partner_id, charge_type, charge_name, charge_amount, description)
SELECT 
    p.id,
    'top_up',
    'Wallet Top-up Fee',
    10.00,
    'Fee for wallet top-up transactions'
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, charge_type) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE partner_charges_config IS 'Configuration for partner-specific charges and fees';
COMMENT ON TABLE partner_charge_transactions IS 'Records of all charge transactions deducted from partner wallets';

COMMENT ON COLUMN partner_charges_config.charge_type IS 'Type of charge: disbursement, float_purchase, top_up, manual_allocation';
COMMENT ON COLUMN partner_charges_config.charge_amount IS 'Fixed charge amount in KES';
COMMENT ON COLUMN partner_charges_config.charge_percentage IS 'Percentage-based charge (optional)';
COMMENT ON COLUMN partner_charges_config.is_automatic IS 'Whether charges are automatically deducted from wallet';

COMMENT ON COLUMN partner_charge_transactions.related_transaction_id IS 'ID of the transaction that triggered this charge';
COMMENT ON COLUMN partner_charge_transactions.wallet_balance_before IS 'Wallet balance before charge deduction';
COMMENT ON COLUMN partner_charge_transactions.wallet_balance_after IS 'Wallet balance after charge deduction';







