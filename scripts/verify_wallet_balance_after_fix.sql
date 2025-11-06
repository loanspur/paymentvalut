-- Verify wallet balance consistency after the fix
-- This checks if stored balance matches sum of ALL completed transactions (not just charges)

SELECT 
    pw.id AS wallet_id,
    p.name AS partner_name,
    pw.current_balance AS stored_balance,
    
    -- Sum of all completed transactions
    COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS sum_all_completed,
    
    -- Sum of completed charges only
    COALESCE(SUM(CASE WHEN wt.status = 'completed' AND wt.transaction_type = 'charge' THEN wt.amount ELSE 0 END), 0) AS sum_completed_charges,
    
    -- Sum of completed top-ups/credits
    COALESCE(SUM(CASE WHEN wt.status = 'completed' AND wt.transaction_type IN ('top_up', 'topup', 'manual_credit') THEN wt.amount ELSE 0 END), 0) AS sum_completed_topups,
    
    -- Sum of pending transactions
    COALESCE(SUM(CASE WHEN wt.status = 'pending' THEN wt.amount ELSE 0 END), 0) AS sum_pending,
    
    -- Counts
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN wt.status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN wt.status = 'failed' THEN 1 END) AS failed_count,
    
    -- Balance difference (should be close to 0 if consistent)
    pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS balance_difference,
    
    -- Status
    CASE 
        WHEN ABS(pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0)) < 0.01 THEN '✅ CONSISTENT'
        WHEN ABS(pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0)) < 100 THEN '⚠️ MINOR DIFFERENCE'
        ELSE '❌ INCONSISTENT'
    END AS consistency_status
    
FROM partner_wallets pw
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id
WHERE p.name IN ('Kulman Group Limited', 'Umoja Magharibi')
GROUP BY pw.id, p.name, pw.current_balance
ORDER BY pw.current_balance DESC;

-- Check for incorrectly completed transactions (should be 0 after fix)
SELECT 
    COUNT(*) AS incorrectly_completed_count,
    SUM(ABS(wt.amount)) AS total_incorrectly_deducted
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE wt.status = 'completed'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status IN ('accepted', 'pending')
  AND p.name IN ('Kulman Group Limited', 'Umoja Magharibi');

-- Check pending transactions that should be completed (disbursement status = 'success')
SELECT 
    COUNT(*) AS should_be_completed_count,
    SUM(ABS(wt.amount)) AS total_pending_amount
FROM wallet_transactions wt
INNER JOIN partner_wallets pw ON wt.wallet_id = pw.id
INNER JOIN partners p ON pw.partner_id = p.id
LEFT JOIN disbursement_requests dr ON dr.id::text = REPLACE(wt.reference, 'DISBURSEMENT_CHARGE_', '')
WHERE wt.status = 'pending'
  AND wt.transaction_type = 'charge'
  AND wt.reference LIKE 'DISBURSEMENT_CHARGE_%'
  AND dr.status = 'success'
  AND p.name IN ('Kulman Group Limited', 'Umoja Magharibi');

