-- Add support for multiple M-Pesa short codes per partner
-- This migration adds short code configuration to partners table

-- Add short code configuration columns to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_shortcode TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_consumer_key TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_consumer_secret TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_passkey TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_environment TEXT DEFAULT 'sandbox';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_mpesa_configured BOOLEAN DEFAULT false;

-- Create index for short code lookups
CREATE INDEX IF NOT EXISTS idx_partners_mpesa_shortcode ON partners(mpesa_shortcode);

-- Update Kulmnagroup Limited with M-Pesa configuration
UPDATE partners 
SET 
    mpesa_shortcode = '174379',
    mpesa_consumer_key = 'YOUR_MPESA_CONSUMER_KEY_1',
    mpesa_consumer_secret = 'YOUR_MPESA_CONSUMER_SECRET_1',
    mpesa_passkey = 'YOUR_MPESA_PASSKEY_1',
    mpesa_environment = 'sandbox',
    is_mpesa_configured = true
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert two additional partner organizations with their own M-Pesa configurations
INSERT INTO partners (
    id, 
    name, 
    api_key_hash, 
    is_active,
    mpesa_shortcode,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_environment,
    is_mpesa_configured
) VALUES 
(
    '660e8400-e29b-41d4-a716-446655440001',
    'Finsef Limited',
    'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890', -- SHA-256 hash of 'finsef_sk_live_1234567890abcdef'
    true,
    '174380',
    'YOUR_FINSEF_MPESA_CONSUMER_KEY',
    'YOUR_FINSEF_MPESA_CONSUMER_SECRET',
    'YOUR_FINSEF_MPESA_PASSKEY',
    'sandbox',
    true
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    'ABC Limited',
    'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcd', -- SHA-256 hash of 'abc_sk_live_1234567890abcdef'
    true,
    '174381',
    'YOUR_ABC_MPESA_CONSUMER_KEY',
    'YOUR_ABC_MPESA_CONSUMER_SECRET',
    'YOUR_ABC_MPESA_PASSKEY',
    'sandbox',
    true
) ON CONFLICT (id) DO NOTHING;

-- Add short code selection to disbursement requests
ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS mpesa_shortcode TEXT;
ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS partner_shortcode_id UUID REFERENCES partners(id);

-- Create index for short code filtering
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_mpesa_shortcode ON disbursement_requests(mpesa_shortcode);
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_partner_shortcode_id ON disbursement_requests(partner_shortcode_id);
