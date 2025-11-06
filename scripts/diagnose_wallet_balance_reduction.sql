-- Diagnostic query to check why wallet balance is reducing for "accepted" transactions
-- This will help identify if pending transactions are affecting the balance

-- 1. Check for pending wallet transactions that should not affect balance
SELECT 
    wt.id,
    wt.wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    wt.transaction_type,
    wt.amount,
    wt.status,
    wt.reference,
    wt.description,
    wt.created_at,
    wt.updated_at,
    wt.metadata->>'disbursement_id' AS disbursement_id,
    dr.status AS disbursement_status,
    pw.current_balance AS wallet_balance
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = wt.metadata->>'disbursement_id'
WHERE wt.status = 'pending'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
ORDER BY wt.created_at DESC
LIMIT 50;

-- 2. Check for wallet transactions with status "completed" but disbursement status is "accepted"
SELECT 
    wt.id,
    wt.wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    wt.transaction_type,
    wt.amount,
    wt.status AS wallet_transaction_status,
    wt.reference,
    wt.description,
    wt.created_at,
    dr.status AS disbursement_status,
    dr.created_at AS disbursement_created_at,
    dr.updated_at AS disbursement_updated_at,
    pw.current_balance AS wallet_balance
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = wt.metadata->>'disbursement_id'
WHERE wt.status = 'completed'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status = 'accepted'
ORDER BY wt.created_at DESC
LIMIT 50;

-- 3. Check wallet balance vs sum of completed transactions
SELECT 
    pw.id AS wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    pw.current_balance AS stored_balance,
    COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS calculated_balance_from_completed,
    COALESCE(SUM(CASE WHEN wt.status = 'pending' THEN wt.amount ELSE 0 END), 0) AS sum_of_pending_transactions,
    COUNT(CASE WHEN wt.status = 'pending' AND wt.transaction_type = 'charge' AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%' THEN 1 END) AS pending_charge_count,
    pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS difference,
    pw.updated_at AS wallet_last_updated
FROM partner_wallets pw
LEFT JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
GROUP BY pw.id, pw.partner_id, p.name, pw.current_balance, pw.updated_at
HAVING COUNT(CASE WHEN wt.status = 'pending' AND wt.transaction_type = 'charge' AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%' THEN 1 END) > 0
ORDER BY pw.updated_at DESC
LIMIT 20;

-- 4. Check recent wallet balance updates
SELECT 
    pw.id AS wallet_id,
    pw.partner_id,
    p.name AS partner_name,
    pw.current_balance,
    pw.updated_at AS wallet_updated_at,
    MAX(wt.created_at) AS last_transaction_date,
    COUNT(CASE WHEN wt.status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_count
FROM partner_wallets pw
LEFT JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
WHERE pw.updated_at > NOW() - INTERVAL '24 hours'
GROUP BY pw.id, pw.partner_id, p.name, pw.current_balance, pw.updated_at
ORDER BY pw.updated_at DESC
LIMIT 20;

