-- Fix wallet transactions that were incorrectly marked as "completed" 
-- when the disbursement status is still "accepted" or "pending"
-- This script will revert these transactions to "pending" status and restore the wallet balance

-- STEP 1: Identify incorrectly completed wallet transactions
-- These are transactions marked as "completed" but the disbursement is still "accepted" or "pending"
WITH incorrect_transactions AS (
    SELECT 
        wt.id AS wallet_transaction_id,
        wt.wallet_id,
        wt.amount,
        wt.status AS current_status,
        wt.reference,
        wt.created_at,
        dr.id AS disbursement_id,
        dr.status AS disbursement_status,
        pw.partner_id,
        pw.current_balance AS current_wallet_balance
    FROM wallet_transactions wt
    INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
    LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
    WHERE wt.status = 'completed'
      AND wt.transaction_type = 'charge'
      AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
      AND dr.status IN ('accepted', 'pending')
)
SELECT 
    *,
    current_wallet_balance + ABS(amount) AS restored_balance
FROM incorrect_transactions
ORDER BY created_at DESC;

-- STEP 2: Revert incorrectly completed transactions to "pending" status
-- This will prevent them from affecting the balance calculation
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

-- STEP 3: Restore wallet balances for incorrectly completed transactions
-- Add back the amounts that were incorrectly deducted
UPDATE partner_wallets pw
SET 
    current_balance = pw.current_balance + ABS(wt.amount),
    updated_at = NOW()
FROM wallet_transactions wt
INNER JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE pw.id = wt.wallet_id
  AND wt.status = 'pending'  -- Only restore for transactions we just reverted
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status IN ('accepted', 'pending')
  AND wt.metadata->>'reverted_from_completed' = 'true';

-- STEP 4: Update partner charge transactions to match
UPDATE partner_charge_transactions pct
SET 
    status = 'pending',
    metadata = COALESCE(pct.metadata, '{}'::jsonb) || jsonb_build_object(
        'reverted_from_completed', true,
        'reverted_at', NOW(),
        'original_status', 'completed',
        'reason', 'Disbursement status is not success'
    ),
    updated_at = NOW()
FROM disbursement_requests dr
WHERE pct.related_transaction_id = dr.id
  AND pct.related_transaction_type = 'disbursement'
  AND pct.status = 'completed'
  AND dr.status IN ('accepted', 'pending')
  AND dr.status != 'success';

-- Verification query: Check if fix was successful
SELECT 
    wt.id,
    wt.status AS wallet_transaction_status,
    dr.status AS disbursement_status,
    wt.reference,
    pw.current_balance,
    wt.metadata->>'reverted_from_completed' AS was_reverted
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status IN ('accepted', 'pending')
ORDER BY wt.created_at DESC
LIMIT 20;

