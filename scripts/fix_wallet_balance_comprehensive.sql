-- Comprehensive fix for wallet balance reduction issue
-- This script will:
-- 1. Identify all incorrectly completed transactions
-- 2. Calculate total amount to restore
-- 3. Restore wallet balances
-- 4. Revert transactions to pending status

-- STEP 1: Identify all incorrectly completed transactions and calculate restoration amounts
WITH incorrect_transactions AS (
    SELECT 
        wt.id AS wallet_transaction_id,
        wt.wallet_id,
        pw.partner_id,
        p.name AS partner_name,
        wt.amount,
        ABS(wt.amount) AS charge_amount,
        wt.status AS current_status,
        wt.reference,
        wt.created_at,
        dr.id AS disbursement_id,
        dr.status AS disbursement_status
    FROM wallet_transactions wt
    INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
    INNER JOIN partners p ON pw.partner_id = p.id
    LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
    WHERE wt.status = 'completed'
      AND wt.transaction_type = 'charge'
      AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
      AND dr.status IN ('accepted', 'pending')
      AND dr.status != 'success'
),
restoration_amounts AS (
    SELECT 
        wallet_id,
        partner_id,
        partner_name,
        SUM(charge_amount) AS total_to_restore,
        COUNT(*) AS transaction_count
    FROM incorrect_transactions
    GROUP BY wallet_id, partner_id, partner_name
)
SELECT 
    *,
    (SELECT current_balance FROM partner_wallets WHERE id = wallet_id) AS current_balance,
    (SELECT current_balance FROM partner_wallets WHERE id = wallet_id) + total_to_restore AS restored_balance
FROM restoration_amounts
ORDER BY total_to_restore DESC;

-- STEP 2: Restore wallet balances (add back incorrectly deducted amounts)
UPDATE partner_wallets pw
SET 
    current_balance = pw.current_balance + restoration.total_to_restore,
    updated_at = NOW()
FROM (
    SELECT 
        wt.wallet_id,
        SUM(ABS(wt.amount)) AS total_to_restore
    FROM wallet_transactions wt
    INNER JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
    WHERE wt.status = 'completed'
      AND wt.transaction_type = 'charge'
      AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
      AND dr.status IN ('accepted', 'pending')
      AND dr.status != 'success'
    GROUP BY wt.wallet_id
) restoration
WHERE pw.id = restoration.wallet_id;

-- STEP 3: Revert incorrectly completed transactions to "pending" status
UPDATE wallet_transactions wt
SET 
    status = 'pending',
    metadata = COALESCE(wt.metadata, '{}'::jsonb) || jsonb_build_object(
        'reverted_from_completed', true,
        'reverted_at', NOW(),
        'original_status', 'completed',
        'reason', 'Disbursement status is not success'
    ),
    updated_at = NOW()
FROM disbursement_requests dr
WHERE wt.reference = CONCAT('DISBURSEMENT_CHARGE_', dr.id::text)
  AND wt.status = 'completed'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status IN ('accepted', 'pending')
  AND dr.status != 'success';

-- STEP 4: Update partner charge transactions to match
-- Note: Only update status if metadata column exists, otherwise just update status
UPDATE partner_charge_transactions pct
SET 
    status = 'pending',
    updated_at = NOW()
FROM disbursement_requests dr
WHERE pct.related_transaction_id = dr.id
  AND pct.related_transaction_type = 'disbursement'
  AND pct.status = 'completed'
  AND dr.status IN ('accepted', 'pending')
  AND dr.status != 'success';

-- Verification: Check results
SELECT 
    pw.id AS wallet_id,
    p.name AS partner_name,
    pw.current_balance,
    pw.updated_at AS wallet_updated_at,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN wt.status = 'pending' THEN 1 END) AS pending_count,
    COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS sum_completed,
    COALESCE(SUM(CASE WHEN wt.status = 'pending' THEN wt.amount ELSE 0 END), 0) AS sum_pending,
    pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS balance_difference
FROM partner_wallets pw
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
WHERE p.name IN ('Kulman Group Limited', 'Umoja Magharibi')
GROUP BY pw.id, p.name, pw.current_balance, pw.updated_at
ORDER BY pw.updated_at DESC;

-- Check for any remaining incorrectly completed transactions
SELECT 
    wt.id,
    wt.wallet_id,
    wt.amount,
    wt.status AS wallet_transaction_status,
    wt.reference,
    dr.status AS disbursement_status,
    p.name AS partner_name
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE wt.status = 'completed'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status IN ('accepted', 'pending')
  AND p.name IN ('Kulman Group Limited', 'Umoja Magharibi')
ORDER BY wt.updated_at DESC
LIMIT 20;

