-- Phase 1: Foundation & NCBA Integration - Database Schema
-- Based on PAYMENT_VAULT_ENHANCEMENT_PRD.md
-- This migration creates the foundation tables for the enhanced system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enhanced Partners Table (add Mifos X configuration)
-- Add Mifos X configuration columns to existing partners table
DO $$
BEGIN
    -- Add Mifos X configuration columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'mifos_host_url') THEN
        ALTER TABLE partners ADD COLUMN mifos_host_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'mifos_username') THEN
        ALTER TABLE partners ADD COLUMN mifos_username VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'mifos_password') THEN
        ALTER TABLE partners ADD COLUMN mifos_password TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'mifos_tenant_id') THEN
        ALTER TABLE partners ADD COLUMN mifos_tenant_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'mifos_api_endpoint') THEN
        ALTER TABLE partners ADD COLUMN mifos_api_endpoint VARCHAR(500) DEFAULT '/fineract-provider/api/v1';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'mifos_auto_disbursement_enabled') THEN
        ALTER TABLE partners ADD COLUMN mifos_auto_disbursement_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'is_mifos_configured') THEN
        ALTER TABLE partners ADD COLUMN is_mifos_configured BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'webhook_url') THEN
        ALTER TABLE partners ADD COLUMN webhook_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'webhook_secret_token') THEN
        ALTER TABLE partners ADD COLUMN webhook_secret_token VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'sms_notifications_enabled') THEN
        ALTER TABLE partners ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'sms_phone_numbers') THEN
        ALTER TABLE partners ADD COLUMN sms_phone_numbers JSONB DEFAULT '[]';
    END IF;
END $$;

-- 2. Partner Wallets Table
CREATE TABLE IF NOT EXISTS partner_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
    current_balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'KES',
    last_topup_date TIMESTAMP,
    last_topup_amount DECIMAL(15,2),
    low_balance_threshold DECIMAL(15,2) DEFAULT 1000,
    sms_notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES partner_wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'topup', 'disbursement', 'b2c_float_purchase', 'charge'
    amount DECIMAL(15,2) NOT NULL,
    reference VARCHAR(100) UNIQUE,
    description TEXT,
    
    -- B2C Float Purchase specific fields
    float_amount DECIMAL(15,2),
    transfer_fee DECIMAL(15,2),
    processing_fee DECIMAL(15,2),
    ncb_transfer_reference VARCHAR(100),
    ncb_float_reference VARCHAR(100),
    
    -- OTP Validation fields
    otp_reference VARCHAR(100),
    otp_validated BOOLEAN DEFAULT FALSE,
    otp_validated_at TIMESTAMP,
    authorized_user_id UUID, -- Will reference users table when created
    
    -- STK Push fields
    stk_push_transaction_id VARCHAR(100),
    ncb_paybill_number VARCHAR(20),
    ncb_account_number VARCHAR(50),
    stk_push_status VARCHAR(20), -- 'initiated', 'pending', 'completed', 'failed'
    ncb_reference_id VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'otp_required', 'completed', 'failed'
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. B2C Float Balance Table
CREATE TABLE IF NOT EXISTS b2c_float_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
    current_float_balance DECIMAL(15,2) DEFAULT 0,
    last_purchase_date TIMESTAMP,
    last_purchase_amount DECIMAL(15,2),
    total_purchased DECIMAL(15,2) DEFAULT 0,
    total_used DECIMAL(15,2) DEFAULT 0,
    ncb_account_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. OTP Validations Table
CREATE TABLE IF NOT EXISTS otp_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID, -- Will reference users table when created
    partner_id UUID REFERENCES partners(id),
    phone_number VARCHAR(20) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'float_purchase', 'disbursement', 'wallet_topup'
    amount DECIMAL(15,2), -- For financial transactions
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'validated', 'expired', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    sms_sent BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. NCBA STK Push Logs Table
CREATE TABLE IF NOT EXISTS ncb_stk_push_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE CASCADE,
    stk_push_transaction_id VARCHAR(100) NOT NULL,
    partner_phone VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    ncb_paybill_number VARCHAR(20) DEFAULT '880100',
    ncb_account_number VARCHAR(50) NOT NULL,
    stk_push_status VARCHAR(20) DEFAULT 'initiated',
    ncb_reference_id VARCHAR(100),
    ncb_response JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. C2B Transactions Table
CREATE TABLE IF NOT EXISTS c2b_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    mifos_account_id VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'loan_repayment', 'savings_deposit'
    mpesa_receipt VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Partner SMS Settings Table
CREATE TABLE IF NOT EXISTS partner_sms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
    damza_api_key VARCHAR(255) NOT NULL, -- Encrypted
    damza_sender_id VARCHAR(50) NOT NULL,
    damza_username VARCHAR(255) NOT NULL,
    damza_password VARCHAR(255) NOT NULL, -- Encrypted
    sms_enabled BOOLEAN DEFAULT TRUE,
    low_balance_threshold DECIMAL(15,2) DEFAULT 1000,
    notification_phone_numbers JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. SMS Notifications Table
CREATE TABLE IF NOT EXISTS sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'balance_alert', 'disbursement_confirmation', 'payment_receipt', 'topup_confirmation'
    message_content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    damza_reference VARCHAR(100),
    damza_sender_id VARCHAR(50), -- Partner's specific sender ID
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partner_wallets_partner_id ON partner_wallets(partner_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_b2c_float_balance_partner_id ON b2c_float_balance(partner_id);
CREATE INDEX IF NOT EXISTS idx_otp_validations_reference ON otp_validations(reference);
CREATE INDEX IF NOT EXISTS idx_otp_validations_partner_id ON otp_validations(partner_id);
CREATE INDEX IF NOT EXISTS idx_otp_validations_status ON otp_validations(status);
CREATE INDEX IF NOT EXISTS idx_ncb_stk_push_logs_partner_id ON ncb_stk_push_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_ncb_stk_push_logs_transaction_id ON ncb_stk_push_logs(stk_push_transaction_id);
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_partner_id ON c2b_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_status ON c2b_transactions(status);
CREATE INDEX IF NOT EXISTS idx_partner_sms_settings_partner_id ON partner_sms_settings(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_partner_id ON sms_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);

-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (with IF NOT EXISTS check)
DO $$
BEGIN
    -- Create triggers only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_partner_wallets_updated_at') THEN
        CREATE TRIGGER update_partner_wallets_updated_at BEFORE UPDATE ON partner_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallet_transactions_updated_at') THEN
        CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_b2c_float_balance_updated_at') THEN
        CREATE TRIGGER update_b2c_float_balance_updated_at BEFORE UPDATE ON b2c_float_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ncb_stk_push_logs_updated_at') THEN
        CREATE TRIGGER update_ncb_stk_push_logs_updated_at BEFORE UPDATE ON ncb_stk_push_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_c2b_transactions_updated_at') THEN
        CREATE TRIGGER update_c2b_transactions_updated_at BEFORE UPDATE ON c2b_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_partner_sms_settings_updated_at') THEN
        CREATE TRIGGER update_partner_sms_settings_updated_at BEFORE UPDATE ON partner_sms_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sms_notifications_updated_at') THEN
        CREATE TRIGGER update_sms_notifications_updated_at BEFORE UPDATE ON sms_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE partner_wallets IS 'Partner wallet balances and settings for transaction charges and B2C float purchases';
COMMENT ON TABLE wallet_transactions IS 'All wallet transactions including top-ups, disbursements, and B2C float purchases';
COMMENT ON TABLE b2c_float_balance IS 'B2C float balance tracking for each partner';
COMMENT ON TABLE otp_validations IS 'OTP validation records for financial transactions';
COMMENT ON TABLE ncb_stk_push_logs IS 'NCBA STK Push transaction logs and status tracking';
COMMENT ON TABLE c2b_transactions IS 'Customer-to-business transactions for loan repayments and savings deposits';
COMMENT ON TABLE partner_sms_settings IS 'Partner-specific Damza SMS configuration';
COMMENT ON TABLE sms_notifications IS 'SMS notification records and delivery tracking';

-- Verify the tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'partner_wallets',
    'wallet_transactions', 
    'b2c_float_balance',
    'otp_validations',
    'ncb_stk_push_logs',
    'c2b_transactions',
    'partner_sms_settings',
    'sms_notifications'
)
ORDER BY table_name;
