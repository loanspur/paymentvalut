-- Add Mifos X configuration to existing partners table
-- This migration adds Mifos X integration fields to the partners table

-- Add Mifos X configuration columns to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_host_url VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_username VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_password TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_tenant_id VARCHAR(100);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_api_endpoint VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_webhook_url VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_webhook_secret_token VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_mifos_configured BOOLEAN DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_auto_disbursement_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_max_disbursement_amount DECIMAL(15,2);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mifos_min_disbursement_amount DECIMAL(15,2);

-- Add comments for clarity
COMMENT ON COLUMN partners.mifos_host_url IS 'Mifos X server host URL (e.g., https://mifos.example.com)';
COMMENT ON COLUMN partners.mifos_username IS 'Mifos X API username';
COMMENT ON COLUMN partners.mifos_password IS 'Mifos X API password (encrypted)';
COMMENT ON COLUMN partners.mifos_tenant_id IS 'Mifos X tenant identifier';
COMMENT ON COLUMN partners.mifos_api_endpoint IS 'Mifos X API endpoint (optional, defaults to /fineract-provider/api/v1)';
COMMENT ON COLUMN partners.mifos_webhook_url IS 'Our webhook URL for Mifos X to call';
COMMENT ON COLUMN partners.mifos_webhook_secret_token IS 'Secret token for webhook authentication';
COMMENT ON COLUMN partners.is_mifos_configured IS 'Whether Mifos X integration is configured';
COMMENT ON COLUMN partners.mifos_auto_disbursement_enabled IS 'Whether automatic disbursement is enabled';
COMMENT ON COLUMN partners.mifos_max_disbursement_amount IS 'Maximum disbursement amount for this partner';
COMMENT ON COLUMN partners.mifos_min_disbursement_amount IS 'Minimum disbursement amount for this partner';

-- Create index for Mifos X configuration lookup
CREATE INDEX IF NOT EXISTS idx_partners_mifos_configured ON partners(is_mifos_configured) WHERE is_mifos_configured = TRUE;

-- Create index for webhook URL lookup
CREATE INDEX IF NOT EXISTS idx_partners_webhook_url ON partners(mifos_webhook_url) WHERE mifos_webhook_url IS NOT NULL;

-- Update the updated_at trigger to include new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists for partners table
DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample Mifos X configuration for existing partners (optional)
-- This is commented out to avoid modifying existing data
/*
UPDATE partners 
SET 
    mifos_host_url = 'https://mifos.example.com',
    mifos_username = 'admin',
    mifos_password = 'encrypted_password_here',
    mifos_tenant_id = 'default',
    mifos_api_endpoint = '/fineract-provider/api/v1',
    mifos_webhook_url = 'https://paymentvault.com/api/mifos/webhook/loan-approval',
    mifos_webhook_secret_token = 'webhook_secret_token_here',
    is_mifos_configured = FALSE,
    mifos_auto_disbursement_enabled = FALSE,
    mifos_max_disbursement_amount = 100000,
    mifos_min_disbursement_amount = 100
WHERE is_active = TRUE;
*/

-- Verification query
SELECT 
    id,
    name,
    is_mifos_configured,
    mifos_auto_disbursement_enabled,
    mifos_max_disbursement_amount,
    mifos_min_disbursement_amount
FROM partners 
WHERE is_active = TRUE
LIMIT 5;

