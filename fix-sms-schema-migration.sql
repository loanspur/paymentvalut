-- Fix SMS schema migration - Add missing columns to existing tables
-- This handles the case where tables exist but are missing some columns

-- 1. Check if partner_sms_settings table exists and add missing columns
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partner_sms_settings') THEN
        -- Add sms_charge_per_message column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'sms_charge_per_message') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN sms_charge_per_message DECIMAL(10,4) DEFAULT 0.50;
            COMMENT ON COLUMN partner_sms_settings.sms_charge_per_message IS 'Cost per SMS message in KES, deducted from wallet';
        END IF;
        
        -- Add other missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_api_key') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_api_key VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_sender_id') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_sender_id VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_username') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_username VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_password') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_password VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'sms_enabled') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN sms_enabled BOOLEAN DEFAULT TRUE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'low_balance_threshold') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN low_balance_threshold DECIMAL(15,2) DEFAULT 1000;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'notification_phone_numbers') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN notification_phone_numbers JSONB DEFAULT '[]';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'created_at') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'updated_at') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
        
        -- Add constraints if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'partner_sms_settings' AND constraint_name = 'partner_sms_settings_partner_id_key') THEN
            ALTER TABLE partner_sms_settings ADD CONSTRAINT partner_sms_settings_partner_id_key UNIQUE (partner_id);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'partner_sms_settings' AND constraint_name = 'partner_sms_settings_partner_id_fkey') THEN
            ALTER TABLE partner_sms_settings ADD CONSTRAINT partner_sms_settings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Updated existing partner_sms_settings table with missing columns';
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE partner_sms_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
            damza_api_key VARCHAR(255) NOT NULL, -- Encrypted
            damza_sender_id VARCHAR(50) NOT NULL, -- Partner's registered sender ID
            damza_username VARCHAR(255) NOT NULL, -- Encrypted
            damza_password VARCHAR(255) NOT NULL, -- Encrypted
            sms_enabled BOOLEAN DEFAULT TRUE,
            low_balance_threshold DECIMAL(15,2) DEFAULT 1000,
            notification_phone_numbers JSONB DEFAULT '[]', -- Array of phone numbers for notifications
            sms_charge_per_message DECIMAL(10,4) DEFAULT 0.50, -- Cost per SMS in KES
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Add comments
        COMMENT ON TABLE partner_sms_settings IS 'Partner-specific Damza SMS configuration settings';
        COMMENT ON COLUMN partner_sms_settings.damza_api_key IS 'Encrypted Damza API key for the partner';
        COMMENT ON COLUMN partner_sms_settings.damza_sender_id IS 'Partner registered sender ID (e.g., ABC Bank, XYZ Sacco)';
        COMMENT ON COLUMN partner_sms_settings.sms_charge_per_message IS 'Cost per SMS message in KES, deducted from wallet';
        
        RAISE NOTICE 'Created new partner_sms_settings table';
    END IF;
END $$;

-- 2. Create sms_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'balance_alert', 'disbursement_confirmation', 'payment_receipt', 'topup_confirmation', 'loan_approval', 'loan_disbursement', 'custom'
    template_content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable names used in template
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Default template for this type
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(partner_id, template_type, template_name)
);

-- Add comments
COMMENT ON TABLE sms_templates IS 'SMS message templates for different notification types';
COMMENT ON COLUMN sms_templates.template_content IS 'SMS message content with placeholders like {customer_name}, {amount}, etc.';
COMMENT ON COLUMN sms_templates.variables IS 'Array of variable names used in the template';

-- 3. Create sms_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'balance_alert', 'disbursement_confirmation', 'payment_receipt', 'topup_confirmation', 'loan_approval', 'loan_disbursement', 'custom'
    message_content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'cancelled'
    damza_reference VARCHAR(100), -- Damza API reference ID
    damza_sender_id VARCHAR(50), -- Partner's specific sender ID used
    sms_cost DECIMAL(10,4) DEFAULT 0.00, -- Cost of this SMS
    wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL, -- Link to wallet charge
    error_message TEXT, -- Error details if failed
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE sms_notifications IS 'SMS notifications sent to customers and partners';
COMMENT ON COLUMN sms_notifications.sms_cost IS 'Cost of this SMS message, deducted from partner wallet';
COMMENT ON COLUMN sms_notifications.wallet_transaction_id IS 'Link to wallet transaction for SMS charge';

-- 4. Create sms_bulk_campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS sms_bulk_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
    message_content TEXT NOT NULL,
    recipient_list JSONB NOT NULL, -- Array of phone numbers and variables
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sending', 'completed', 'cancelled', 'failed'
    scheduled_at TIMESTAMP, -- For scheduled campaigns
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE sms_bulk_campaigns IS 'Bulk SMS campaigns for mass messaging';
COMMENT ON COLUMN sms_bulk_campaigns.recipient_list IS 'Array of objects with phone numbers and personalized variables';

-- 5. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_sms_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers (drop existing ones first to avoid conflicts)
DROP TRIGGER IF EXISTS update_partner_sms_settings_updated_at ON partner_sms_settings;
DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;
DROP TRIGGER IF EXISTS update_sms_notifications_updated_at ON sms_notifications;
DROP TRIGGER IF EXISTS update_sms_bulk_campaigns_updated_at ON sms_bulk_campaigns;

CREATE TRIGGER update_partner_sms_settings_updated_at 
    BEFORE UPDATE ON partner_sms_settings 
    FOR EACH ROW EXECUTE FUNCTION update_sms_tables_updated_at();

CREATE TRIGGER update_sms_templates_updated_at 
    BEFORE UPDATE ON sms_templates 
    FOR EACH ROW EXECUTE FUNCTION update_sms_tables_updated_at();

CREATE TRIGGER update_sms_notifications_updated_at 
    BEFORE UPDATE ON sms_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_sms_tables_updated_at();

CREATE TRIGGER update_sms_bulk_campaigns_updated_at 
    BEFORE UPDATE ON sms_bulk_campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_sms_tables_updated_at();

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_sms_settings_partner_id ON partner_sms_settings(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_partner_id ON sms_templates(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_type ON sms_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_partner_id ON sms_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_bulk_campaigns_partner_id ON sms_bulk_campaigns(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_bulk_campaigns_status ON sms_bulk_campaigns(status);

-- 7. Insert default SMS templates for each partner
INSERT INTO sms_templates (partner_id, template_name, template_type, template_content, variables, is_default, is_active)
SELECT 
    p.id as partner_id,
    'Balance Alert' as template_name,
    'balance_alert' as template_type,
    'Dear {partner_name}, your wallet balance is KES {balance}. Please top up to continue using our services. - {sender_id}' as template_content,
    '["partner_name", "balance", "sender_id"]'::jsonb as variables,
    true as is_default,
    true as is_active
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, template_type, template_name) DO NOTHING;

INSERT INTO sms_templates (partner_id, template_name, template_type, template_content, variables, is_default, is_active)
SELECT 
    p.id as partner_id,
    'Disbursement Confirmation' as template_name,
    'disbursement_confirmation' as template_type,
    'Dear {customer_name}, your loan of KES {amount} has been disbursed to {phone_number}. Transaction ID: {transaction_id}. - {sender_id}' as template_content,
    '["customer_name", "amount", "phone_number", "transaction_id", "sender_id"]'::jsonb as variables,
    true as is_default,
    true as is_active
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, template_type, template_name) DO NOTHING;

INSERT INTO sms_templates (partner_id, template_name, template_type, template_content, variables, is_default, is_active)
SELECT 
    p.id as partner_id,
    'Payment Receipt' as template_name,
    'payment_receipt' as template_type,
    'Dear {customer_name}, payment of KES {amount} received successfully. Receipt: {receipt_number}. Balance: KES {balance}. - {sender_id}' as template_content,
    '["customer_name", "amount", "receipt_number", "balance", "sender_id"]'::jsonb as variables,
    true as is_default,
    true as is_active
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, template_type, template_name) DO NOTHING;

INSERT INTO sms_templates (partner_id, template_name, template_type, template_content, variables, is_default, is_active)
SELECT 
    p.id as partner_id,
    'Wallet Top-up Confirmation' as template_name,
    'topup_confirmation' as template_type,
    'Dear {partner_name}, your wallet has been topped up with KES {amount}. New balance: KES {balance}. - {sender_id}' as template_content,
    '["partner_name", "amount", "balance", "sender_id"]'::jsonb as variables,
    true as is_default,
    true as is_active
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, template_type, template_name) DO NOTHING;

-- 8. Final comment
COMMENT ON TABLE partner_sms_settings IS 'Partner-specific Damza SMS configuration with wallet integration for SMS charges';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'SMS schema migration completed successfully!';
    RAISE NOTICE 'Tables created/updated: partner_sms_settings, sms_templates, sms_notifications, sms_bulk_campaigns';
    RAISE NOTICE 'Default SMS templates inserted for all active partners';
END $$;
