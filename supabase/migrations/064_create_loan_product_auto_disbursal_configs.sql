-- Create loan product auto-disbursal configurations table
-- This table stores which loan products should have automatic disbursement enabled

CREATE TABLE IF NOT EXISTS loan_product_auto_disbursal_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL, -- Mifos X loan product ID
    product_name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    max_amount DECIMAL(15,2) DEFAULT 0,
    min_amount DECIMAL(15,2) DEFAULT 0,
    requires_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, product_id)
);

-- Add comments
COMMENT ON TABLE loan_product_auto_disbursal_configs IS 'Configuration for automatic disbursement of specific loan products';
COMMENT ON COLUMN loan_product_auto_disbursal_configs.product_id IS 'Mifos X loan product ID';
COMMENT ON COLUMN loan_product_auto_disbursal_configs.enabled IS 'Whether auto-disbursal is enabled for this product';
COMMENT ON COLUMN loan_product_auto_disbursal_configs.max_amount IS 'Maximum amount for auto-disbursal';
COMMENT ON COLUMN loan_product_auto_disbursal_configs.min_amount IS 'Minimum amount for auto-disbursal';
COMMENT ON COLUMN loan_product_auto_disbursal_configs.requires_approval IS 'Whether manual approval is required before disbursement';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_loan_product_auto_disbursal_configs_partner ON loan_product_auto_disbursal_configs(partner_id);
CREATE INDEX IF NOT EXISTS idx_loan_product_auto_disbursal_configs_product ON loan_product_auto_disbursal_configs(product_id);
CREATE INDEX IF NOT EXISTS idx_loan_product_auto_disbursal_configs_enabled ON loan_product_auto_disbursal_configs(enabled) WHERE enabled = TRUE;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_loan_product_auto_disbursal_configs_updated_at ON loan_product_auto_disbursal_configs;
CREATE TRIGGER update_loan_product_auto_disbursal_configs_updated_at
    BEFORE UPDATE ON loan_product_auto_disbursal_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verification query
SELECT 
    'loan_product_auto_disbursal_configs' as table_name,
    COUNT(*) as record_count
FROM loan_product_auto_disbursal_configs;

