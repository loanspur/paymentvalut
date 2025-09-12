-- Add a test partner for development/testing purposes
-- This should be removed in production

-- Insert test partner with known API key
INSERT INTO partners (
    id,
    name,
    short_code,
    mpesa_shortcode,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_environment,
    is_active,
    is_mpesa_configured,
    api_key_hash,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440099',
    'Test Partner Limited',
    'TEST',
    '174379',
    'test_consumer_key',
    'test_consumer_secret',
    'test_passkey',
    'sandbox',
    true,
    true,
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- SHA-256 hash of 'test_api_key_12345'
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
