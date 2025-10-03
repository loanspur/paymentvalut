-- Add missing encrypted_credentials column to partners table
-- This fixes the 500 error in the store-credentials API

-- Add encrypted_credentials column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'encrypted_credentials') THEN
        ALTER TABLE partners ADD COLUMN encrypted_credentials TEXT;
        RAISE NOTICE 'Added encrypted_credentials column';
    ELSE
        RAISE NOTICE 'encrypted_credentials column already exists';
    END IF;
    
    -- Add security_credential column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'security_credential') THEN
        ALTER TABLE partners ADD COLUMN security_credential TEXT;
        RAISE NOTICE 'Added security_credential column';
    ELSE
        RAISE NOTICE 'security_credential column already exists';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partners_encrypted_credentials 
ON partners(encrypted_credentials) 
WHERE encrypted_credentials IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partners_security_credential 
ON partners(security_credential) 
WHERE security_credential IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN partners.encrypted_credentials IS 'Encrypted M-Pesa credentials stored in vault format for Edge Functions';
COMMENT ON COLUMN partners.security_credential IS 'RSA-encrypted SecurityCredential for M-Pesa B2C transactions';

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'partners' 
  AND column_name IN ('encrypted_credentials', 'security_credential')
ORDER BY column_name;
