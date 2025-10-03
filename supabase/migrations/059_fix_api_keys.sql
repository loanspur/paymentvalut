-- Fix API keys for testing - Simple migration to ensure API keys are available
-- This migration adds API keys directly without complex dependencies

-- First, ensure the partners table has the necessary columns
DO $$ 
BEGIN
    -- Add api_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key') THEN
        ALTER TABLE partners ADD COLUMN api_key TEXT;
    END IF;
    
    -- Add api_key_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'partners' AND column_name = 'api_key_hash') THEN
        ALTER TABLE partners ADD COLUMN api_key_hash TEXT;
    END IF;
END $$;

-- Insert or update partners with API keys
INSERT INTO partners (id, name, api_key, api_key_hash, is_active, is_mpesa_configured, created_at, updated_at)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Kulman Group Limited', 
     'kulman_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
     'b3dd3dd43d1bc4c780c8c2406a7f7ee166ae37c99a0fe1c1abf7b12ede7924e3',
     true, true, NOW(), NOW()),
    ('660e8400-e29b-41d4-a716-446655440001', 'Finsef Limited',
     'finsef_sk_live_1234567890abcdef',
     '3b52518285799eb777cce983292e43ccbe77d743307e469011fc7c504fa596f5',
     true, true, NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440002', 'ABC Limited',
     'abc_sk_live_1234567890abcdef',
     'f3e52d572f5d90aacd8ee90c2beef75b2acdec44b830ba955776739db0170f4d',
     true, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    api_key_hash = EXCLUDED.api_key_hash,
    is_active = EXCLUDED.is_active,
    is_mpesa_configured = EXCLUDED.is_mpesa_configured,
    updated_at = NOW();

-- Verify the API keys are set
SELECT 
    id, 
    name, 
    api_key,
    api_key_hash,
    is_active,
    is_mpesa_configured
FROM partners 
WHERE api_key IS NOT NULL
ORDER BY name;
