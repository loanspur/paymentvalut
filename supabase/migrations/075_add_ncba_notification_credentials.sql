-- Add NCBA Paybill Push Notification credentials to partners table
-- These are used to authenticate and validate incoming payment notifications

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS ncba_business_short_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS ncba_notification_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS ncba_notification_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS ncba_notification_secret_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS ncba_notification_endpoint_url TEXT,
ADD COLUMN IF NOT EXISTS ncba_account_reference VARCHAR(100);

-- Add comments to explain the new columns
COMMENT ON COLUMN partners.ncba_business_short_code IS 'NCBA business short code (880100 for paybill)';
COMMENT ON COLUMN partners.ncba_notification_username IS 'Username for NCBA Paybill Push Notification authentication';
COMMENT ON COLUMN partners.ncba_notification_password IS 'Password for NCBA Paybill Push Notification authentication';
COMMENT ON COLUMN partners.ncba_notification_secret_key IS 'Secret key for generating and validating notification hashes';
COMMENT ON COLUMN partners.ncba_notification_endpoint_url IS 'Endpoint URL where NCBA will send payment notifications';
COMMENT ON COLUMN partners.ncba_account_reference IS 'Account reference for NCBA paybill payments';

-- Create index for faster lookups by business short code
CREATE INDEX IF NOT EXISTS idx_partners_ncba_business_short_code 
ON partners(ncba_business_short_code) 
WHERE ncba_business_short_code IS NOT NULL;

-- Add missing columns to c2b_transactions table for NCBA notifications
ALTER TABLE c2b_transactions 
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS transaction_time VARCHAR(20),
ADD COLUMN IF NOT EXISTS business_short_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS bill_reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS raw_notification JSONB;

-- Create index for C2B transactions by transaction ID to prevent duplicates
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_transaction_id 
ON c2b_transactions(transaction_id);

-- Create index for C2B transactions by partner and date for reporting
CREATE INDEX IF NOT EXISTS idx_c2b_transactions_partner_created 
ON c2b_transactions(partner_id, created_at DESC);
