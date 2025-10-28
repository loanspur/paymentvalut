-- TJS678PBFN TRANSACTION INVESTIGATION
-- Run this script to specifically check the TJS678PBFN transaction

-- 1. Check if TJS678PBFN exists in C2B transactions
SELECT 
    'TJS678PBFN C2B Check' as check_type,
    c2b.id,
    c2b.transaction_id,
    c2b.partner_id,
    p.name as partner_name,
    c2b.amount,
    c2b.business_short_code,
    c2b.bill_reference_number,
    c2b.customer_phone,
    c2b.customer_name,
    c2b.status,
    c2b.created_at,
    c2b.raw_notification
FROM c2b_transactions c2b
LEFT JOIN partners p ON c2b.partner_id = p.id
WHERE c2b.transaction_id = 'TJS678PBFN'
   OR c2b.transaction_id ILIKE '%TJS678PBFN%';

-- 2. Check if TJS678PBFN exists in wallet transactions
SELECT 
    'TJS678PBFN Wallet Check' as check_type,
    wt.id,
    wt.wallet_id,
    wt.transaction_type,
    wt.amount,
    wt.reference,
    wt.description,
    wt.status,
    wt.metadata,
    wt.created_at,
    pw.partner_id,
    p.name as partner_name
FROM wallet_transactions wt
JOIN partner_wallets pw ON wt.wallet_id = pw.id
JOIN partners p ON pw.partner_id = p.id
WHERE wt.reference = 'TJS678PBFN'
   OR wt.reference ILIKE '%TJS678PBFN%'
   OR wt.description ILIKE '%TJS678PBFN%';

-- 3. Check Finsafe partner details
SELECT 
    'Finsafe Partner Details' as check_type,
    p.id,
    p.name,
    p.short_code,
    p.is_active,
    p.created_at
FROM partners p
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%';

-- 4. Check Finsafe wallet balance
SELECT 
    'Finsafe Wallet Balance' as check_type,
    pw.id as wallet_id,
    pw.partner_id,
    p.name as partner_name,
    pw.current_balance,
    pw.last_topup_date,
    pw.last_topup_amount,
    pw.updated_at
FROM partner_wallets pw
JOIN partners p ON pw.partner_id = p.id
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%';

-- 5. Check recent transactions for Finsafe (last 7 days)
SELECT 
    'Recent Finsafe Transactions' as check_type,
    'C2B' as transaction_source,
    c2b.id,
    c2b.transaction_id,
    c2b.amount,
    c2b.status,
    c2b.created_at
FROM c2b_transactions c2b
JOIN partners p ON c2b.partner_id = p.id
WHERE (p.name ILIKE '%finsafe%' OR p.short_code ILIKE '%finsafe%')
  AND c2b.created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Recent Finsafe Transactions' as check_type,
    'Wallet' as transaction_source,
    wt.id,
    wt.reference,
    wt.amount,
    wt.status,
    wt.created_at
FROM wallet_transactions wt
JOIN partner_wallets pw ON wt.wallet_id = pw.id
JOIN partners p ON pw.partner_id = p.id
WHERE (p.name ILIKE '%finsafe%' OR p.short_code ILIKE '%finsafe%')
  AND wt.created_at >= NOW() - INTERVAL '7 days'

ORDER BY created_at DESC
LIMIT 10;

-- 6. Check for any transactions with amount 2.00 (TJS678PBFN amount)
SELECT 
    'Transactions with Amount 2.00' as check_type,
    'C2B' as source,
    c2b.id,
    c2b.transaction_id,
    c2b.amount,
    c2b.status,
    c2b.created_at,
    p.name as partner_name
FROM c2b_transactions c2b
JOIN partners p ON c2b.partner_id = p.id
WHERE c2b.amount = 2.00
  AND c2b.created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Transactions with Amount 2.00' as check_type,
    'Wallet' as source,
    wt.id,
    wt.reference,
    wt.amount,
    wt.status,
    wt.created_at,
    p.name as partner_name
FROM wallet_transactions wt
JOIN partner_wallets pw ON wt.wallet_id = pw.id
JOIN partners p ON pw.partner_id = p.id
WHERE wt.amount = 2.00
  AND wt.created_at >= NOW() - INTERVAL '7 days'

ORDER BY created_at DESC;

-- 7. Check NCBA system settings
SELECT 
    'NCBA Settings' as check_type,
    setting_key,
    setting_value,
    description
FROM system_settings
WHERE setting_key IN (
    'ncba_business_short_code',
    'ncba_notification_username', 
    'ncba_notification_password',
    'ncba_notification_secret_key',
    'ncba_account_number'
)
ORDER BY setting_key;
