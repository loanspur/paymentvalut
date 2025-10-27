-- Fix wallet_transactions table schema by adding missing columns
-- This migration adds the missing columns that are required for manual wallet allocations

-- Add metadata column for storing additional transaction data
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add currency column for transaction currency
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';

-- Add reference column for transaction reference
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

-- Add description column for transaction description
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add status column for transaction status
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference);

-- Add comments for documentation
COMMENT ON COLUMN wallet_transactions.metadata IS 'Additional transaction metadata in JSON format';
COMMENT ON COLUMN wallet_transactions.currency IS 'Transaction currency (default: KES)';
COMMENT ON COLUMN wallet_transactions.reference IS 'Unique transaction reference identifier';
COMMENT ON COLUMN wallet_transactions.description IS 'Human-readable transaction description';
COMMENT ON COLUMN wallet_transactions.status IS 'Transaction status (pending, completed, failed, cancelled)';






