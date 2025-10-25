-- Create wallet for partner that doesn't have one
-- Run this in your Supabase SQL Editor

-- First, check which partners don't have wallets
SELECT 
    p.id,
    p.name,
    p.short_code,
    CASE WHEN pw.id IS NULL THEN 'No Wallet' ELSE 'Has Wallet' END as wallet_status
FROM partners p
LEFT JOIN partner_wallets pw ON p.id = pw.partner_id
WHERE p.is_active = true;

-- Create wallets for partners that don't have them
INSERT INTO partner_wallets (partner_id, current_balance, currency, created_at, updated_at)
SELECT 
    p.id,
    1000.00, -- Starting balance of 1000 KES
    'KES',
    NOW(),
    NOW()
FROM partners p
LEFT JOIN partner_wallets pw ON p.id = pw.partner_id
WHERE p.is_active = true 
AND pw.id IS NULL;

-- Verify wallets were created
SELECT 
    p.name as partner_name,
    pw.current_balance,
    pw.currency,
    pw.created_at
FROM partners p
JOIN partner_wallets pw ON p.id = pw.partner_id
ORDER BY p.name;

-- Success message
SELECT 'Partner wallets created successfully!' as message;
