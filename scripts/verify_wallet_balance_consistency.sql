-- Partner Wallet Balance Consistency Verification Query
-- This query checks if partner_wallets.current_balance matches the sum of wallet_transactions.amount
-- It also identifies any missing wallet_transactions records for balance updates

-- 1. Check balance consistency: Compare partner_wallets.current_balance vs sum of wallet_transactions
WITH wallet_balance_calc AS (
    SELECT 
        pw.id AS wallet_id,
        pw.partner_id,
        pw.current_balance AS stored_balance,
        COALESCE(SUM(wt.amount), 0) AS calculated_balance,
        pw.current_balance - COALESCE(SUM(wt.amount), 0) AS balance_difference,
        COUNT(wt.id) AS transaction_count
    FROM partner_wallets pw
    LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id AND wt.status = 'completed'
    GROUP BY pw.id, pw.partner_id, pw.current_balance
)
SELECT 
    wb.wallet_id,
    wb.partner_id,
    p.name AS partner_name,
    wb.stored_balance,
    wb.calculated_balance,
    wb.balance_difference,
    wb.transaction_count,
    CASE 
        WHEN ABS(wb.balance_difference) > 0.01 THEN 'INCONSISTENT'
        ELSE 'OK'
    END AS status
FROM wallet_balance_calc wb
LEFT JOIN partners p ON wb.partner_id = p.id
WHERE ABS(wb.balance_difference) > 0.01  -- Only show inconsistencies (tolerance for rounding)
ORDER BY ABS(wb.balance_difference) DESC;

-- 2. Check for missing wallet_transactions records for c2b_transactions that have partner_id
SELECT 
    c2b.id AS c2b_transaction_id,
    c2b.partner_id,
    p.name AS partner_name,
    c2b.amount,
    c2b.transaction_id,
    c2b.created_at AS c2b_created_at,
    CASE 
        WHEN wt.id IS NULL THEN 'MISSING_WALLET_TRANSACTION'
        ELSE 'OK'
    END AS wallet_transaction_status
FROM c2b_transactions c2b
LEFT JOIN partners p ON c2b.partner_id = p.id
LEFT JOIN wallet_transactions wt ON wt.reference = c2b.transaction_id OR wt.reference = CONCAT('C2B_', c2b.id::text)
WHERE c2b.partner_id IS NOT NULL
  AND wt.id IS NULL
ORDER BY c2b.created_at DESC;

-- 3. Check for RPC function calls that might have updated balances without creating transactions
-- (This would require checking application logs, but we can check for wallets with transactions but no wallet_transactions)
SELECT 
    pw.id AS wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    pw.current_balance,
    COUNT(wt.id) AS transaction_count,
    CASE 
        WHEN pw.current_balance != 0 AND COUNT(wt.id) = 0 THEN 'SUSPICIOUS: Balance without transactions'
        ELSE 'OK'
    END AS status
FROM partner_wallets pw
LEFT JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
GROUP BY pw.id, pw.partner_id, p.name, pw.current_balance
HAVING pw.current_balance != 0 AND COUNT(wt.id) = 0;

-- 4. Summary statistics
SELECT 
    COUNT(*) AS total_wallets,
    COUNT(CASE WHEN pw.current_balance > 0 THEN 1 END) AS wallets_with_balance,
    SUM(pw.current_balance) AS total_stored_balance,
    COALESCE(SUM(wt.amount), 0) AS total_calculated_balance,
    SUM(pw.current_balance) - COALESCE(SUM(wt.amount), 0) AS total_difference
FROM partner_wallets pw
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id AND wt.status = 'completed';

