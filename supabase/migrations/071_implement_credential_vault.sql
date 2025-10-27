-- Migration to implement secure credential vault
-- This migration adds encrypted credential storage and removes plain text credentials

-- Add encrypted credentials column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partners' 
        AND column_name = 'encrypted_credentials'
    ) THEN
        ALTER TABLE partners ADD COLUMN encrypted_credentials TEXT;
        RAISE NOTICE 'Added encrypted_credentials column to partners table';
    ELSE
        RAISE NOTICE 'encrypted_credentials column already exists in partners table';
    END IF;
END $$;

-- Add vault passphrase (this should be set as an environment variable)
-- For now, we'll use a placeholder that should be changed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partners' 
        AND column_name = 'vault_passphrase_hash'
    ) THEN
        ALTER TABLE partners ADD COLUMN vault_passphrase_hash TEXT;
        RAISE NOTICE 'Added vault_passphrase_hash column to partners table';
    ELSE
        RAISE NOTICE 'vault_passphrase_hash column already exists in partners table';
    END IF;
END $$;

-- Create a function to hash passphrases
CREATE OR REPLACE FUNCTION hash_vault_passphrase(passphrase TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use SHA-256 hash of the passphrase
  RETURN encode(sha256(passphrase::bytea), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update the table to remove plain text credentials (we'll do this after migration)
-- For now, just add the new columns

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partners_encrypted_credentials 
ON partners(encrypted_credentials) 
WHERE encrypted_credentials IS NOT NULL;

-- Add RLS policy for encrypted credentials
-- Only allow access to encrypted credentials with proper authentication
CREATE POLICY "Encrypted credentials access policy" ON partners
FOR SELECT USING (
  auth.role() = 'service_role' OR 
  auth.uid()::text = id::text
);

-- Update the existing RLS policy to include encrypted credentials
DROP POLICY IF EXISTS "Partners can view their own data" ON partners;
CREATE POLICY "Partners can view their own data" ON partners
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.uid()::text = id::text
);

-- Add comment explaining the vault system
COMMENT ON COLUMN partners.encrypted_credentials IS 'Encrypted M-Pesa credentials using AES-GCM encryption';
COMMENT ON COLUMN partners.vault_passphrase_hash IS 'SHA-256 hash of the vault passphrase used for encryption';
