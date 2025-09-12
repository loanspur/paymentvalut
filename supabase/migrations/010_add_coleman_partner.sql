-- Add Coleman partner with real M-Pesa credentials
-- This should be updated with actual production credentials

-- Insert Coleman partner
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
    '550e8400-e29b-41d4-a716-446655440098',
    'Coleman Limited',
    'COLEMAN',
    '174379', -- Replace with Coleman's actual short code
    'YOUR_COLEMAN_CONSUMER_KEY', -- Replace with Coleman's actual consumer key
    'YOUR_COLEMAN_CONSUMER_SECRET', -- Replace with Coleman's actual consumer secret
    'YOUR_COLEMAN_PASSKEY', -- Replace with Coleman's actual passkey
    'production', -- Use production environment for real transactions
    true,
    true,
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- SHA-256 hash of 'test_api_key_12345'
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
