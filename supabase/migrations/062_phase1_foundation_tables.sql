-- Phase 1: Foundation Tables for Payment Vault Enhancement
-- This migration creates the foundational tables for Mifos X integration, wallet system, and SMS notifications
-- Date: December 2024
-- Version: 1.0

-- ==============================================
-- 1. MIFOS PARTNERS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS mifos_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  mifos_host_url VARCHAR(500) NOT NULL,
  mifos_username VARCHAR(255) NOT NULL,
  mifos_password TEXT NOT NULL, -- Encrypted
  mifos_tenant_id VARCHAR(100) NOT NULL,
  api_endpoint VARCHAR(500),
  webhook_url VARCHAR(500), -- Our webhook endpoint for Mifos X to call
  webhook_secret_token VARCHAR(255), -- For webhook authentication
  sms_notifications_enabled BOOLEAN DEFAULT TRUE,
  sms_phone_numbers JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(partner_id, mifos_host_url)
);

-- Add comments
COMMENT ON TABLE mifos_partners IS 'Mifos X integration configuration for each partner';
COMMENT ON COLUMN mifos_partners.mifos_password IS 'Encrypted Mifos X password stored securely';
COMMENT ON COLUMN mifos_partners.webhook_secret_token IS 'Token for authenticating webhook requests from Mifos X';

-- ==============================================
-- 2. LOAN PRODUCTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mifos_partner_id UUID REFERENCES mifos_partners(id) ON DELETE CASCADE,
  mifos_product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  is_auto_disbursement_enabled BOOLEAN DEFAULT FALSE,
  max_disbursement_amount DECIMAL(15,2),
  min_disbursement_amount DECIMAL(15,2),
  disbursement_rules JSONB DEFAULT '{}',
  sms_notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mifos_partner_id, mifos_product_id)
);

-- Add comments
COMMENT ON TABLE loan_products IS 'Loan product configuration from Mifos X systems';
COMMENT ON COLUMN loan_products.disbursement_rules IS 'JSON configuration for disbursement rules and limits';

-- ==============================================
-- 3. PARTNER WALLETS TABLE
-- ==============================================

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

-- Add comments
COMMENT ON TABLE partner_wallets IS 'Prepaid wallet system for transaction charges and B2C float purchases';
COMMENT ON COLUMN partner_wallets.low_balance_threshold IS 'Minimum balance threshold for SMS notifications';

-- ==============================================
-- 4. WALLET TRANSACTIONS TABLE
-- ==============================================

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
  authorized_user_id UUID REFERENCES users(id),
  
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

-- Add comments
COMMENT ON TABLE wallet_transactions IS 'Complete audit trail for all wallet operations including STK Push transactions';
COMMENT ON COLUMN wallet_transactions.transaction_type IS 'Type of wallet transaction: topup, disbursement, b2c_float_purchase, charge';
COMMENT ON COLUMN wallet_transactions.stk_push_status IS 'Status of NCBA STK Push transaction';

-- ==============================================
-- 5. B2C FLOAT BALANCE TABLE
-- ==============================================

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

-- Add comments
COMMENT ON TABLE b2c_float_balance IS 'B2C float balance tracking for M-Pesa disbursements';

-- ==============================================
-- 6. OTP VALIDATIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS otp_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
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

-- Add comments
COMMENT ON TABLE otp_validations IS 'OTP validation system for financial transactions';
COMMENT ON COLUMN otp_validations.purpose IS 'Purpose of OTP: float_purchase, disbursement, wallet_topup';

-- ==============================================
-- 7. C2B TRANSACTIONS TABLE
-- ==============================================

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

-- Add comments
COMMENT ON TABLE c2b_transactions IS 'C2B transactions for loan repayments and savings deposits';

-- ==============================================
-- 8. PARTNER SMS SETTINGS TABLE
-- ==============================================

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

-- Add comments
COMMENT ON TABLE partner_sms_settings IS 'Partner-specific Damza SMS configuration';
COMMENT ON COLUMN partner_sms_settings.damza_api_key IS 'Encrypted Damza API key for each partner';
COMMENT ON COLUMN partner_sms_settings.damza_password IS 'Encrypted Damza password for each partner';

-- ==============================================
-- 9. SMS NOTIFICATIONS TABLE
-- ==============================================

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

-- Add comments
COMMENT ON TABLE sms_notifications IS 'SMS notification tracking and delivery status';
COMMENT ON COLUMN sms_notifications.message_type IS 'Type of SMS: balance_alert, disbursement_confirmation, payment_receipt, topup_confirmation';

-- ==============================================
-- 10. NCB STK PUSH LOGS TABLE
-- ==============================================

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

-- Add comments
COMMENT ON TABLE ncb_stk_push_logs IS 'NCBA STK Push transaction logs and responses';

-- ==============================================
-- 11. PERFORMANCE INDEXES
-- ==============================================

-- Indexes for mifos_partners
CREATE INDEX IF NOT EXISTS idx_mifos_partners_partner_id ON mifos_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_mifos_partners_is_active ON mifos_partners(is_active);
CREATE INDEX IF NOT EXISTS idx_mifos_partners_created_at ON mifos_partners(created_at);

-- Indexes for loan_products
CREATE INDEX IF NOT EXISTS idx_loan_products_mifos_partner_id ON loan_products(mifos_partner_id);
CREATE INDEX IF NOT EXISTS idx_loan_products_mifos_product_id ON loan_products(mifos_product_id);
CREATE INDEX IF NOT EXISTS idx_loan_products_auto_disbursement ON loan_products(is_auto_disbursement_enabled);

-- Indexes for partner_wallets
CREATE INDEX IF NOT EXISTS idx_partner_wallets_partner_id ON partner_wallets(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_wallets_current_balance ON partner_wallets(current_balance);
CREATE INDEX IF NOT EXISTS idx_partner_wallets_low_balance ON partner_wallets(low_balance_threshold);

-- Indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_stk_push_id ON wallet_transactions(stk_push_transaction_id);

-- Indexes for b2c_float_balance
CREATE INDEX IF NOT EXISTS idx_b2c_float_balance_partner_id ON b2c_float_balance(partner_id);
CREATE INDEX IF NOT EXISTS idx_b2c_float_balance_current_balance ON b2c_float_balance(current_float_balance);

-- Indexes for otp_validations
CREATE INDEX IF NOT EXISTS idx_otp_validations_reference ON otp_validations(reference);
CREATE INDEX IF NOT EXISTS idx_otp_validations_partner_id ON otp_validations(partner_id);
CREATE INDEX IF NOT EXISTS idx_otp_validations_status ON otp_validations(status);
CREATE INDEX IF NOT EXISTS idx_otp_validations_expires_at ON otp_validations(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_validations_purpose ON otp_validations(purpose);

-- Indexes for c2b_transactions
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_partner_id ON c2b_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_customer_phone ON c2b_transactions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_status ON c2b_transactions(status);
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_created_at ON c2b_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_mifos_account_id ON c2b_transactions(mifos_account_id);

-- Indexes for partner_sms_settings
CREATE INDEX IF NOT EXISTS idx_partner_sms_settings_partner_id ON partner_sms_settings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_sms_settings_sms_enabled ON partner_sms_settings(sms_enabled);

-- Indexes for sms_notifications
CREATE INDEX IF NOT EXISTS idx_sms_notifications_partner_id ON sms_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_recipient_phone ON sms_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_message_type ON sms_notifications(message_type);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at);

-- Indexes for ncb_stk_push_logs
CREATE INDEX IF NOT EXISTS idx_ncb_stk_push_logs_partner_id ON ncb_stk_push_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_ncb_stk_push_logs_wallet_transaction_id ON ncb_stk_push_logs(wallet_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ncb_stk_push_logs_stk_push_transaction_id ON ncb_stk_push_logs(stk_push_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ncb_stk_push_logs_status ON ncb_stk_push_logs(stk_push_status);
CREATE INDEX IF NOT EXISTS idx_ncb_stk_push_logs_created_at ON ncb_stk_push_logs(created_at);

-- ==============================================
-- 12. TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for all tables with updated_at column
CREATE TRIGGER update_mifos_partners_updated_at BEFORE UPDATE ON mifos_partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loan_products_updated_at BEFORE UPDATE ON loan_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partner_wallets_updated_at BEFORE UPDATE ON partner_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_b2c_float_balance_updated_at BEFORE UPDATE ON b2c_float_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_c2b_transactions_updated_at BEFORE UPDATE ON c2b_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partner_sms_settings_updated_at BEFORE UPDATE ON partner_sms_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_notifications_updated_at BEFORE UPDATE ON sms_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ncb_stk_push_logs_updated_at BEFORE UPDATE ON ncb_stk_push_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 13. INITIAL DATA SETUP
-- ==============================================

-- Create wallet for existing partners
INSERT INTO partner_wallets (partner_id, current_balance, low_balance_threshold, sms_notifications_enabled)
SELECT 
    p.id,
    0.00, -- Initial balance
    1000.00, -- Default low balance threshold
    TRUE -- Enable SMS notifications
FROM partners p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM partner_wallets pw WHERE pw.partner_id = p.id
);

-- Create B2C float balance for existing partners
INSERT INTO b2c_float_balance (partner_id, current_float_balance, total_purchased, total_used)
SELECT 
    p.id,
    0.00, -- Initial float balance
    0.00, -- No purchases yet
    0.00  -- No usage yet
FROM partners p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM b2c_float_balance bfb WHERE bfb.partner_id = p.id
);

-- ==============================================
-- 14. VERIFICATION QUERIES
-- ==============================================

-- Verify all tables were created
SELECT 
    'TABLE CREATION VERIFICATION' as check_type,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'CREATED' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'mifos_partners', 'loan_products', 'partner_wallets', 'wallet_transactions',
    'b2c_float_balance', 'otp_validations', 'c2b_transactions', 
    'partner_sms_settings', 'sms_notifications', 'ncb_stk_push_logs'
)
ORDER BY table_name;

-- Verify indexes were created
SELECT 
    'INDEX CREATION VERIFICATION' as check_type,
    indexname,
    CASE WHEN indexname IS NOT NULL THEN 'CREATED' ELSE 'MISSING' END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Verify initial data setup
SELECT 
    'INITIAL DATA VERIFICATION' as check_type,
    'partner_wallets' as table_name,
    COUNT(*) as record_count
FROM partner_wallets
UNION ALL
SELECT 
    'INITIAL DATA VERIFICATION' as check_type,
    'b2c_float_balance' as table_name,
    COUNT(*) as record_count
FROM b2c_float_balance;

-- ==============================================
-- 15. MIGRATION COMPLETION
-- ==============================================

-- Log migration completion
INSERT INTO balance_alerts (
    partner_id,
    alert_type,
    account_type,
    current_balance,
    threshold_balance,
    alert_message,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'migration_complete',
    'b2c',
    0,
    0,
    'Phase 1 Foundation Tables migration completed successfully at ' || now(),
    now()
);

-- Add migration metadata
COMMENT ON TABLE mifos_partners IS 'Phase 1: Mifos X integration partners - Migration 062';
COMMENT ON TABLE loan_products IS 'Phase 1: Loan products from Mifos X - Migration 062';
COMMENT ON TABLE partner_wallets IS 'Phase 1: Partner wallet system - Migration 062';
COMMENT ON TABLE wallet_transactions IS 'Phase 1: Wallet transaction audit trail - Migration 062';
COMMENT ON TABLE b2c_float_balance IS 'Phase 1: B2C float balance tracking - Migration 062';
COMMENT ON TABLE otp_validations IS 'Phase 1: OTP validation system - Migration 062';
COMMENT ON TABLE c2b_transactions IS 'Phase 1: C2B transaction management - Migration 062';
COMMENT ON TABLE partner_sms_settings IS 'Phase 1: Partner SMS configuration - Migration 062';
COMMENT ON TABLE sms_notifications IS 'Phase 1: SMS notification tracking - Migration 062';
COMMENT ON TABLE ncb_stk_push_logs IS 'Phase 1: NCBA STK Push logs - Migration 062';

-- Success message
SELECT 
    'MIGRATION COMPLETED SUCCESSFULLY' as status,
    'Phase 1 Foundation Tables' as phase,
    'All tables, indexes, and triggers created' as details,
    now() as completed_at;
