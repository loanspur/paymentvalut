-- SQL script to clean up dummy/test wallet transactions
-- Run this in your Supabase SQL Editor

-- 1. Remove test transactions
DELETE FROM wallet_transactions 
WHERE reference LIKE 'test_%' 
   OR reference LIKE 'TEST_%'
   OR description LIKE '%Test%'
   OR description LIKE '%test%'
   OR description LIKE '%TEST%';

-- 2. Remove dummy transactions
DELETE FROM wallet_transactions 
WHERE reference LIKE 'DUMMY_%'
   OR reference LIKE 'SAMPLE_%'
   OR reference LIKE 'DEMO_%'
   OR reference LIKE 'dummy_%'
   OR reference LIKE 'sample_%'
   OR reference LIKE 'demo_%';

-- 3. Remove transactions with unrealistic amounts (likely test data)
DELETE FROM wallet_transactions 
WHERE amount > 1000000  -- More than 1M KES
   OR amount < -1000000; -- Less than -1M KES

-- 4. Reset wallet balances that are unrealistic (likely test data)
UPDATE partner_wallets 
SET current_balance = 0 
WHERE current_balance > 1000000; -- More than 1M KES

-- 5. Clean up any orphaned transactions (transactions without valid wallet)
DELETE FROM wallet_transactions 
WHERE wallet_id NOT IN (
    SELECT id FROM partner_wallets
);

-- 6. Show summary of remaining transactions
SELECT 
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN transaction_type = 'top_up' THEN 1 END) as top_ups,
    COUNT(CASE WHEN transaction_type = 'disbursement' THEN 1 END) as disbursements,
    COUNT(CASE WHEN transaction_type = 'b2c_float_purchase' THEN 1 END) as float_purchases,
    COUNT(CASE WHEN transaction_type = 'charge' THEN 1 END) as charges,
    SUM(amount) as total_amount
FROM wallet_transactions;

-- 7. Show wallet balances
SELECT 
    p.name as partner_name,
    pw.current_balance,
    pw.currency,
    pw.low_balance_threshold
FROM partner_wallets pw
JOIN partners p ON pw.partner_id = p.id
ORDER BY pw.current_balance DESC;
