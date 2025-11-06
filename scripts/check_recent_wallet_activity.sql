-- Check recent wallet activity to understand why balance is still reducing
-- This will help identify if transactions are being completed incorrectly

-- 1. Check recent wallet transactions for Kulman Group Limited
SELECT 
    wt.id,
    wt.wallet_id,
    wt.transaction_type,
    wt.amount,
    wt.status,
    wt.reference,
    wt.description,
    wt.created_at,
    wt.updated_at,
    dr.id AS disbursement_id,
    dr.status AS disbursement_status,
    dr.created_at AS disbursement_created_at,
    dr.updated_at AS disbursement_updated_at,
    wt.metadata->>'disbursement_id' AS metadata_disbursement_id,
    wt.metadata->>'reverted_from_completed' AS was_reverted
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE p.name = 'Kulman Group Limited'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND wt.created_at > NOW() - INTERVAL '1 hour'
ORDER BY wt.created_at DESC
LIMIT 50;

-- 2. Check for completed transactions where disbursement is still "accepted" or "pending"
SELECT 
    wt.id,
    wt.wallet_id,
    wt.amount,
    wt.status AS wallet_transaction_status,
    wt.reference,
    wt.created_at,
    wt.updated_at,
    dr.id AS disbursement_id,
    dr.status AS disbursement_status,
    dr.created_at AS disbursement_created_at,
    dr.updated_at AS disbursement_updated_at,
    p.name AS partner_name,
    pw.current_balance
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE wt.status = 'completed'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status IN ('accepted', 'pending')
ORDER BY wt.updated_at DESC
LIMIT 50;

-- 3. Check wallet balance changes over time
SELECT 
    pw.id AS wallet_id,
    p.name AS partner_name,
    pw.current_balance,
    pw.updated_at AS wallet_updated_at,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_transactions,
    COUNT(CASE WHEN wt.status = 'pending' THEN 1 END) AS pending_transactions,
    COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS sum_completed,
    COALESCE(SUM(CASE WHEN wt.status = 'pending' THEN wt.amount ELSE 0 END), 0) AS sum_pending,
    pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS balance_difference
FROM partner_wallets pw
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
WHERE p.name IN ('Kulman Group Limited', 'Umoja Magharibi')
GROUP BY pw.id, p.name, pw.current_balance, pw.updated_at
ORDER BY pw.updated_at DESC;

-- 4. Check if there are transactions being completed by the callback handler
SELECT 
    wt.id,
    wt.wallet_id,
    wt.amount,
    wt.status,
    wt.reference,
    wt.created_at,
    wt.updated_at,
    dr.id AS disbursement_id,
    dr.status AS disbursement_status,
    dr.updated_at AS disbursement_updated_at,
    CASE 
        WHEN wt.updated_at > wt.created_at AND dr.status = 'success' THEN 'Correctly completed'
        WHEN wt.updated_at > wt.created_at AND dr.status IN ('accepted', 'pending') THEN 'Incorrectly completed'
        WHEN wt.status = 'pending' AND dr.status = 'success' THEN 'Should be completed'
        ELSE 'Status OK'
    END AS status_check
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE p.name = 'Kulman Group Limited'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND wt.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY wt.updated_at DESC
LIMIT 50;

