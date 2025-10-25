-- SMS Database Tables Creation Script
-- Run this in your Supabase SQL Editor

-- 1. Create partner_sms_settings table
CREATE TABLE IF NOT EXISTS partner_sms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
    damza_api_key VARCHAR(255) NOT NULL DEFAULT '',
    damza_sender_id VARCHAR(50) NOT NULL DEFAULT '',
    damza_username VARCHAR(255) NOT NULL DEFAULT '',
    damza_password VARCHAR(255) NOT NULL DEFAULT '',
    sms_enabled BOOLEAN DEFAULT TRUE,
    low_balance_threshold DECIMAL(15,2) DEFAULT 1000,
    notification_phone_numbers JSONB DEFAULT '[]',
    sms_charge_per_message DECIMAL(10,4) DEFAULT 0.50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create sms_templates table
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL,
    template_type VARCHAR(50) DEFAULT 'custom',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(partner_id, template_name)
);

-- 3. Create sms_notifications table
CREATE TABLE IF NOT EXISTS sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    message_content TEXT NOT NULL,
    sms_cost DECIMAL(10,4) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending',
    damza_reference VARCHAR(100),
    damza_sender_id VARCHAR(50),
    bulk_campaign_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create sms_bulk_campaigns table
CREATE TABLE IF NOT EXISTS sms_bulk_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
    recipients_count INTEGER DEFAULT 0,
    total_sms_cost DECIMAL(15,4) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Add foreign key constraint for bulk_campaign_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sms_notifications_bulk_campaign_id_fkey'
    ) THEN
        ALTER TABLE sms_notifications 
        ADD CONSTRAINT sms_notifications_bulk_campaign_id_fkey 
        FOREIGN KEY (bulk_campaign_id) REFERENCES sms_bulk_campaigns(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables (only if they don't exist)
DO $$
BEGIN
    -- Partner SMS Settings trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_partner_sms_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_partner_sms_settings_updated_at
            BEFORE UPDATE ON partner_sms_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- SMS Templates trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_sms_templates_updated_at'
    ) THEN
        CREATE TRIGGER update_sms_templates_updated_at
            BEFORE UPDATE ON sms_templates
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- SMS Notifications trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_sms_notifications_updated_at'
    ) THEN
        CREATE TRIGGER update_sms_notifications_updated_at
            BEFORE UPDATE ON sms_notifications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- SMS Bulk Campaigns trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_sms_bulk_campaigns_updated_at'
    ) THEN
        CREATE TRIGGER update_sms_bulk_campaigns_updated_at
            BEFORE UPDATE ON sms_bulk_campaigns
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 7. Insert default SMS templates for existing partners
INSERT INTO sms_templates (partner_id, template_name, template_content, template_type)
SELECT
    p.id,
    'Welcome Message',
    'Dear {customer_name}, welcome to {partner_name}! Your account has been successfully set up.',
    'system'
FROM partners p
WHERE p.is_active = TRUE
ON CONFLICT (partner_id, template_name) DO NOTHING;

INSERT INTO sms_templates (partner_id, template_name, template_content, template_type)
SELECT
    p.id,
    'Loan Disbursement',
    'Dear {customer_name}, your loan of KES {amount} has been disbursed to your M-Pesa. Ref: {reference}.',
    'system'
FROM partners p
WHERE p.is_active = TRUE
ON CONFLICT (partner_id, template_name) DO NOTHING;

INSERT INTO sms_templates (partner_id, template_name, template_content, template_type)
SELECT
    p.id,
    'Payment Confirmation',
    'Dear {customer_name}, your payment of KES {amount} has been received. Thank you!',
    'system'
FROM partners p
WHERE p.is_active = TRUE
ON CONFLICT (partner_id, template_name) DO NOTHING;

-- 8. Grant necessary permissions
GRANT ALL ON partner_sms_settings TO authenticated;
GRANT ALL ON sms_templates TO authenticated;
GRANT ALL ON sms_notifications TO authenticated;
GRANT ALL ON sms_bulk_campaigns TO authenticated;

-- Success message
SELECT 'SMS tables created successfully!' as message;
