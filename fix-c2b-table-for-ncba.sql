-- Fix c2b_transactions table to support NCBA transactions
-- Make mifos_account_id nullable since NCBA transactions don't need it

ALTER TABLE c2b_transactions 
ALTER COLUMN mifos_account_id DROP NOT NULL;

-- Add comment to explain the change
COMMENT ON COLUMN c2b_transactions.mifos_account_id IS 'Mifos X account ID (required for Mifos C2B, optional for NCBA Paybill)';


