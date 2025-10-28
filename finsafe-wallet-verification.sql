-- FINSAFE PARTNER WALLET VERIFICATION QUERIES
-- Run these queries in Supabase SQL Editor to verify Finsafe wallet status

-- 1. Find Finsafe Partner Details
SELECT 
    'Finsafe Partner Details' as query_type,
    p.id as partner_id,
    p.name as partner_name,
    p.short_code,
    p.is_active,
    p.created_at as partner_created_at
FROM partners p
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%'
ORDER BY p.created_at DESC;

-- 2. Check Finsafe Wallet Balance
SELECT 
    'Finsafe Wallet Balance' as query_type,
    pw.id as wallet_id,
    pw.partner_id,
    p.name as partner_name,
    pw.current_balance,
    pw.currency,
    pw.last_topup_date,
    pw.last_topup_amount,
    pw.low_balance_threshold,
    pw.is_active as wallet_active,
    pw.created_at as wallet_created_at,
    pw.updated_at as wallet_updated_at
FROM partner_wallets pw
JOIN partners p ON pw.partner_id = p.id
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%'
ORDER BY pw.updated_at DESC;

-- 3. Check Recent C2B Transactions for Finsafe
SELECT 
    'Recent C2B Transactions' as query_type,
    c2b.id as transaction_id,
    c2b.partner_id,
    p.name as partner_name,
    c2b.transaction_id as ncba_transaction_id,
    c2b.transaction_type,
    c2b.amount,
    c2b.business_short_code,
    c2b.bill_reference_number,
    c2b.customer_phone,
    c2b.customer_name,
    c2b.status,
    c2b.created_at,
    c2b.updated_at
FROM c2b_transactions c2b
JOIN partners p ON c2b.partner_id = p.id
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%'
ORDER BY c2b.created_at DESC
LIMIT 20;

-- 4. Check Wallet Transactions for Finsafe
SELECT 
    'Wallet Transactions' as query_type,
    wt.id as wallet_transaction_id,
    wt.wallet_id,
    wt.transaction_type,
    wt.amount,
    wt.reference,
    wt.description,
    wt.status,
    wt.metadata,
    wt.created_at,
    wt.updated_at,
    pw.partner_id,
    p.name as partner_name
FROM wallet_transactions wt
JOIN partner_wallets pw ON wt.wallet_id = pw.id
JOIN partners p ON pw.partner_id = p.id
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%'
ORDER BY wt.created_at DESC
LIMIT 20;

-- 5. Check for TJS678PBFN Transaction Specifically
SELECT 
    'TJS678PBFN Transaction Check' as query_type,
    'C2B Transaction' as source,
    c2b.id,
    c2b.transaction_id,
    c2b.amount,
    c2b.status,
    c2b.created_at,
    p.name as partner_name
FROM c2b_transactions c2b
JOIN partners p ON c2b.partner_id = p.id
WHERE c2b.transaction_id ILIKE '%TJS678PBFN%'
   OR c2b.bill_reference_number ILIKE '%TJS678PBFN%'

UNION ALL

SELECT 
    'TJS678PBFN Transaction Check' as query_type,
    'Wallet Transaction' as source,
    wt.id,
    wt.reference,
    wt.amount,
    wt.status,
    wt.created_at,
    p.name as partner_name
FROM wallet_transactions wt
JOIN partner_wallets pw ON wt.wallet_id = pw.id
JOIN partners p ON pw.partner_id = p.id
WHERE wt.reference ILIKE '%TJS678PBFN%'
   OR wt.description ILIKE '%TJS678PBFN%'

ORDER BY created_at DESC;

-- 6. Check Recent Paybill Notifications (if logged)
SELECT 
    'Recent Paybill Activity' as query_type,
    'Last 24 hours' as time_range,
    COUNT(*) as total_transactions,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount
FROM c2b_transactions c2b
JOIN partners p ON c2b.partner_id = p.id
WHERE (p.name ILIKE '%finsafe%' OR p.short_code ILIKE '%finsafe%')
  AND c2b.created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Recent Paybill Activity' as query_type,
    'Last 7 days' as time_range,
    COUNT(*) as total_transactions,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount
FROM c2b_transactions c2b
JOIN partners p ON c2b.partner_id = p.id
WHERE (p.name ILIKE '%finsafe%' OR p.short_code ILIKE '%finsafe%')
  AND c2b.created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Recent Paybill Activity' as query_type,
    'Last 30 days' as time_range,
    COUNT(*) as total_transactions,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount
FROM c2b_transactions c2b
JOIN partners p ON c2b.partner_id = p.id
WHERE (p.name ILIKE '%finsafe%' OR p.short_code ILIKE '%finsafe%')
  AND c2b.created_at >= NOW() - INTERVAL '30 days';

-- 7. Check System Settings for NCBA Configuration
SELECT 
    'NCBA System Settings' as query_type,
    setting_key,
    setting_value,
    description,
    setting_type
FROM system_settings
WHERE setting_key LIKE '%ncba%'
   OR setting_key LIKE '%774451%'
ORDER BY setting_key;

-- 8. Summary Report for Finsafe
SELECT 
    'Finsafe Summary Report' as query_type,
    p.name as partner_name,
    p.short_code,
    pw.current_balance,
    pw.last_topup_date,
    pw.last_topup_amount,
    COUNT(DISTINCT c2b.id) as total_c2b_transactions,
    COUNT(DISTINCT wt.id) as total_wallet_transactions,
    COALESCE(SUM(c2b.amount), 0) as total_c2b_amount,
    COALESCE(SUM(wt.amount), 0) as total_wallet_amount,
    MAX(c2b.created_at) as last_c2b_transaction,
    MAX(wt.created_at) as last_wallet_transaction
FROM partners p
LEFT JOIN partner_wallets pw ON p.id = pw.partner_id
LEFT JOIN c2b_transactions c2b ON p.id = c2b.partner_id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%'
GROUP BY p.id, p.name, p.short_code, pw.current_balance, pw.last_topup_date, pw.last_topup_amount;
