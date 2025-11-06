-- Diagnostic queries to understand wallet balance discrepancies
-- Run these queries to identify the root cause of balance inconsistencies

-- 1. Check wallets with balance but no completed transactions
SELECT 
    pw.id AS wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    pw.current_balance AS stored_balance,
    COUNT(wt.id) AS total_transactions,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_transactions,
    COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS calculated_balance,
    pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS difference
FROM partner_wallets pw
LEFT JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
GROUP BY pw.id, pw.partner_id, p.name, pw.current_balance
HAVING pw.current_balance != 0 AND COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) = 0
ORDER BY pw.current_balance DESC
LIMIT 20;

-- 2. Check wallets with balance but very few transactions
SELECT 
    pw.id AS wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    pw.current_balance AS stored_balance,
    COUNT(wt.id) AS total_transactions,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_transactions,
    COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS calculated_balance,
    pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS difference
FROM partner_wallets pw
LEFT JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
GROUP BY pw.id, pw.partner_id, p.name, pw.current_balance
HAVING pw.current_balance > 1000 AND COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) < 3
ORDER BY ABS(pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0)) DESC
LIMIT 20;

-- 3. Check for C2B transactions that should have created wallet transactions
SELECT 
    c2b.id AS c2b_id,
    c2b.partner_id,
    p.name AS partner_name,
    c2b.amount AS c2b_amount,
    c2b.transaction_id,
    c2b.status AS c2b_status,
    c2b.created_at AS c2b_created_at,
    wt.id AS wallet_transaction_id,
    wt.amount AS wallet_transaction_amount,
    wt.status AS wallet_transaction_status
FROM c2b_transactions c2b
LEFT JOIN partners p ON c2b.partner_id = p.id
LEFT JOIN wallet_transactions wt ON (
    wt.reference = c2b.transaction_id 
    OR wt.reference = CONCAT('C2B_', c2b.id::text)
    OR (wt.metadata->>'c2b_transaction_id')::text = c2b.id::text
)
WHERE c2b.partner_id IS NOT NULL
  AND c2b.status = 'completed'
  AND wt.id IS NULL
ORDER BY c2b.created_at DESC
LIMIT 50;

-- 4. Check transaction types distribution
SELECT 
    wt.transaction_type,
    COUNT(*) AS transaction_count,
    SUM(wt.amount) AS total_amount,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_count,
    SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END) AS completed_amount
FROM wallet_transactions wt
GROUP BY wt.transaction_type
ORDER BY transaction_count DESC;

-- 5. Check for transactions with status != 'completed' that might affect balance
SELECT 
    wt.status,
    COUNT(*) AS count,
    SUM(wt.amount) AS total_amount
FROM wallet_transactions wt
GROUP BY wt.status
ORDER BY count DESC;

-- 6. Check wallets with largest discrepancies
SELECT 
    pw.id AS wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    pw.current_balance AS stored_balance,
    COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS calculated_balance,
    pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS difference,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_transaction_count
FROM partner_wallets pw
LEFT JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
GROUP BY pw.id, pw.partner_id, p.name, pw.current_balance
HAVING ABS(pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0)) > 100
ORDER BY ABS(pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0)) DESC
LIMIT 30;

-- 7. Check when wallets were last updated vs when transactions were created
SELECT 
    pw.id AS wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    pw.current_balance,
    pw.updated_at AS wallet_last_updated,
    MAX(wt.created_at) AS last_transaction_created,
    CASE 
        WHEN pw.updated_at > MAX(wt.created_at) THEN 'Wallet updated after last transaction'
        WHEN MAX(wt.created_at) IS NULL THEN 'No transactions'
        ELSE 'OK'
    END AS status
FROM partner_wallets pw
LEFT JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
GROUP BY pw.id, pw.partner_id, p.name, pw.current_balance, pw.updated_at
HAVING pw.current_balance > 0 AND (MAX(wt.created_at) IS NULL OR pw.updated_at > MAX(wt.created_at))
ORDER BY pw.current_balance DESC
LIMIT 20;

