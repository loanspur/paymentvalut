-- FINSAFE WALLET COMPLETE STATUS CHECK
-- Run this single query to get a complete overview of Finsafe's wallet status

WITH finsafe_partner AS (
    SELECT id, name, short_code, is_active, created_at
    FROM partners 
    WHERE name ILIKE '%finsafe%' OR short_code ILIKE '%finsafe%'
),
finsafe_wallet AS (
    SELECT pw.*, fp.name as partner_name
    FROM partner_wallets pw
    JOIN finsafe_partner fp ON pw.partner_id = fp.id
),
recent_c2b AS (
    SELECT 
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        MAX(c2b.created_at) as last_transaction,
        MIN(c2b.created_at) as first_transaction
    FROM c2b_transactions c2b
    JOIN finsafe_partner fp ON c2b.partner_id = fp.id
    WHERE c2b.created_at >= NOW() - INTERVAL '30 days'
),
recent_wallet_tx AS (
    SELECT 
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        MAX(wt.created_at) as last_transaction,
        MIN(wt.created_at) as first_transaction
    FROM wallet_transactions wt
    JOIN finsafe_wallet fw ON wt.wallet_id = fw.id
    WHERE wt.created_at >= NOW() - INTERVAL '30 days'
),
tjs678pbfn_check AS (
    SELECT 
        'C2B' as source,
        c2b.id,
        c2b.transaction_id,
        c2b.amount,
        c2b.status,
        c2b.created_at
    FROM c2b_transactions c2b
    JOIN finsafe_partner fp ON c2b.partner_id = fp.id
    WHERE c2b.transaction_id = 'TJS678PBFN'
    
    UNION ALL
    
    SELECT 
        'Wallet' as source,
        wt.id,
        wt.reference,
        wt.amount,
        wt.status,
        wt.created_at
    FROM wallet_transactions wt
    JOIN finsafe_wallet fw ON wt.wallet_id = fw.id
    WHERE wt.reference = 'TJS678PBFN'
)

SELECT 
    '=== FINSAFE WALLET STATUS REPORT ===' as report_section,
    '' as details
UNION ALL

SELECT 
    'PARTNER INFORMATION' as report_section,
    CONCAT('ID: ', fp.id, ' | Name: ', fp.name, ' | Short Code: ', fp.short_code, ' | Active: ', fp.is_active) as details
FROM finsafe_partner fp
UNION ALL

SELECT 
    'WALLET BALANCE' as report_section,
    CONCAT('Current Balance: Ksh ', fw.current_balance, ' | Last Topup: ', fw.last_topup_date, ' | Last Amount: Ksh ', fw.last_topup_amount) as details
FROM finsafe_wallet fw
UNION ALL

SELECT 
    'RECENT ACTIVITY (30 DAYS)' as report_section,
    CONCAT('C2B Transactions: ', rc.transaction_count, ' | Total Amount: Ksh ', rc.total_amount, ' | Last: ', rc.last_transaction) as details
FROM recent_c2b rc
UNION ALL

SELECT 
    'WALLET TRANSACTIONS (30 DAYS)' as report_section,
    CONCAT('Count: ', rwt.transaction_count, ' | Total Amount: Ksh ', rwt.total_amount, ' | Last: ', rwt.last_transaction) as details
FROM recent_wallet_tx rwt
UNION ALL

SELECT 
    'TJS678PBFN STATUS' as report_section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM tjs678pbfn_check) 
        THEN 'FOUND - Transaction exists in database'
        ELSE 'NOT FOUND - Transaction missing from database'
    END as details
UNION ALL

SELECT 
    'RECOMMENDATION' as report_section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM tjs678pbfn_check) 
        THEN 'No action needed - transaction was processed'
        ELSE 'Run manual credit script to process TJS678PBFN'
    END as details;
