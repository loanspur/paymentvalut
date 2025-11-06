-- COMPREHENSIVE REPAIR SCRIPT - Handles all balance inconsistencies
-- This script repairs wallets where balance doesn't match sum of transactions
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT
-- 
-- IMPORTANT: Run scripts/diagnose_wallet_balance_issues.sql FIRST to understand the scope
--
-- This script:
-- 1. Creates missing wallet_transactions for C2B transactions
-- 2. Creates reconciliation transactions for wallets where balance != sum of transactions

-- STEP 1: Create missing wallet_transactions for C2B transactions
-- Only for completed C2B transactions that have a partner_id but no wallet_transaction
INSERT INTO wallet_transactions (
    wallet_id,
    transaction_type,
    amount,
    reference,
    description,
    status,
    metadata,
    created_at,
    updated_at
)
SELECT 
    pw.id AS wallet_id,
    'top_up' AS transaction_type,
    c2b.amount,
    COALESCE(c2b.transaction_id, CONCAT('C2B_', c2b.id::text)) AS reference,
    CONCAT('C2B allocation from ', COALESCE(c2b.customer_phone, 'unknown')) AS description,
    'completed' AS status,
    jsonb_build_object(
        'c2b_transaction_id', c2b.id,
        'transaction_id', c2b.transaction_id,
        'customer_phone', c2b.customer_phone,
        'customer_name', c2b.customer_name,
        'repair_action', 'created_from_c2b',
        'repair_date', NOW()
    ) AS metadata,
    c2b.created_at,
    NOW() AS updated_at
FROM c2b_transactions c2b
INNER JOIN partner_wallets pw ON c2b.partner_id = pw.partner_id
LEFT JOIN wallet_transactions wt ON (
    wt.wallet_id = pw.id 
    AND (
        wt.reference = c2b.transaction_id 
        OR wt.reference = CONCAT('C2B_', c2b.id::text)
        OR (wt.metadata->>'c2b_transaction_id')::text = c2b.id::text
    )
)
WHERE c2b.partner_id IS NOT NULL
  AND c2b.status = 'completed'
  AND wt.id IS NULL
  AND c2b.amount > 0
ON CONFLICT (reference) DO NOTHING;

-- STEP 2: Create reconciliation transactions for wallets with balance discrepancies
-- This handles wallets where balance was updated but transactions don't match
WITH wallet_balance_calc AS (
    SELECT 
        pw.id AS wallet_id,
        pw.partner_id,
        pw.current_balance AS stored_balance,
        COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS calculated_balance,
        pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS balance_difference,
        MAX(wt.created_at) AS last_transaction_date,
        pw.updated_at AS wallet_last_updated
    FROM partner_wallets pw
    LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
    GROUP BY pw.id, pw.partner_id, pw.current_balance, pw.updated_at
    HAVING ABS(pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0)) > 0.01
)
INSERT INTO wallet_transactions (
    wallet_id,
    transaction_type,
    amount,
    reference,
    description,
    status,
    metadata,
    created_at,
    updated_at
)
SELECT 
    wb.wallet_id,
    CASE 
        WHEN wb.balance_difference > 0 THEN 'manual_credit'
        ELSE 'manual_debit'
    END AS transaction_type,
    wb.balance_difference AS amount,
    CONCAT('RECONCILIATION_', wb.wallet_id::text, '_', EXTRACT(EPOCH FROM NOW())::bigint) AS reference,
    CASE 
        WHEN wb.balance_difference > 0 THEN 
            CONCAT('Balance reconciliation - missing credit of ', ABS(wb.balance_difference), ' KES')
        ELSE 
            CONCAT('Balance reconciliation - missing debit of ', ABS(wb.balance_difference), ' KES')
    END AS description,
    'completed' AS status,
    jsonb_build_object(
        'repair_action', 'balance_reconciliation',
        'repair_date', NOW(),
        'wallet_balance_before', wb.calculated_balance,
        'wallet_balance_after', wb.stored_balance,
        'balance_difference', wb.balance_difference,
        'last_transaction_date', wb.last_transaction_date,
        'wallet_last_updated', wb.wallet_last_updated,
        'note', 'This transaction reconciles the difference between stored balance and calculated balance from transactions'
    ) AS metadata,
    COALESCE(wb.wallet_last_updated, NOW()) AS created_at,
    NOW() AS updated_at
FROM wallet_balance_calc wb
WHERE NOT EXISTS (
    -- Don't create if we already created a reconciliation transaction for this wallet
    SELECT 1
    FROM wallet_transactions wt2
    WHERE wt2.wallet_id = wb.wallet_id
      AND wt2.metadata->>'repair_action' = 'balance_reconciliation'
      AND ABS(CAST(wt2.metadata->>'balance_difference' AS DECIMAL) - wb.balance_difference) < 0.01
)
ON CONFLICT (reference) DO NOTHING;

-- STEP 3: For wallets with balance but NO transactions at all, create initial balance transaction
INSERT INTO wallet_transactions (
    wallet_id,
    transaction_type,
    amount,
    reference,
    description,
    status,
    metadata,
    created_at,
    updated_at
)
SELECT 
    pw.id AS wallet_id,
    'manual_credit' AS transaction_type,
    pw.current_balance AS amount,
    CONCAT('INITIAL_BALANCE_', pw.id::text) AS reference,
    'Initial balance reconciliation - balance existed before transaction tracking' AS description,
    'completed' AS status,
    jsonb_build_object(
        'repair_action', 'initial_balance_reconciliation',
        'repair_date', NOW(),
        'wallet_balance_before', 0,
        'wallet_balance_after', pw.current_balance,
        'note', 'This transaction represents the balance that existed before proper transaction tracking was implemented'
    ) AS metadata,
    pw.created_at,
    NOW() AS updated_at
FROM partner_wallets pw
WHERE pw.current_balance != 0
  AND NOT EXISTS (
      SELECT 1 
      FROM wallet_transactions wt 
      WHERE wt.wallet_id = pw.id 
        AND wt.status = 'completed'
  )
  -- Only create if we haven't already created a transaction for this wallet
  AND NOT EXISTS (
      SELECT 1
      FROM wallet_transactions wt2
      WHERE wt2.wallet_id = pw.id
        AND (wt2.reference LIKE CONCAT('INITIAL_BALANCE_', pw.id::text)
             OR wt2.metadata->>'repair_action' = 'initial_balance_reconciliation')
  )
ON CONFLICT (reference) DO NOTHING;

-- STEP 4: Verify the repair
-- Run this query after the repair to check if balances are now consistent
WITH wallet_balance_calc AS (
    SELECT 
        pw.id AS wallet_id,
        pw.partner_id,
        pw.current_balance AS stored_balance,
        COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS calculated_balance,
        pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS balance_difference
    FROM partner_wallets pw
    LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id AND wt.status = 'completed'
    GROUP BY pw.id, pw.partner_id, pw.current_balance
)
SELECT 
    COUNT(*) AS total_wallets,
    COUNT(CASE WHEN ABS(balance_difference) > 0.01 THEN 1 END) AS inconsistent_wallets,
    SUM(stored_balance) AS total_stored_balance,
    SUM(calculated_balance) AS total_calculated_balance,
    SUM(balance_difference) AS total_difference
FROM wallet_balance_calc;

