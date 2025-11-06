-- SAFE REPAIR SCRIPT - Creates missing wallet_transactions for C2B transactions only
-- This is a safer approach that only creates transactions for known C2B transactions
-- Run this first before running the full repair script

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

-- After running this, check the balance consistency again
-- If there are still discrepancies, you may need to run the full repair script
-- but review the diagnostic queries first to understand what's missing

