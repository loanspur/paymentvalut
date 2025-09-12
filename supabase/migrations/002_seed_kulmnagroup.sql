-- Partner seeding migration
-- This migration creates the initial Kulman Group Limited partner

-- Insert Kulman Group Limited as the initial partner
INSERT INTO partners (
    id,
    name,
    api_key_hash,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Kulman Group Limited',
    '59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539', -- SHA-256 hash of 'kulmna_sk_live_1234567890abcdef'
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
