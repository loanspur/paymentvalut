-- Extract balance information from recent disbursement responses
-- This is an alternative approach since Account Balance API is failing

-- Check recent disbursement responses for balance data
SELECT 
    'RECENT DISBURSEMENT BALANCE DATA' as check_type,
    dr.id,
    dr.partner_id,
    p.name as partner_name,
    p.mpesa_shortcode,
    dr.status,
    dr.utility_account_balance,
    dr.working_account_balance,
    dr.charges_account_balance,
    dr.created_at,
    dr.updated_at,
    CASE 
        WHEN dr.created_at > NOW() - INTERVAL '1 hour' THEN 'VERY_RECENT'
        WHEN dr.created_at > NOW() - INTERVAL '24 hours' THEN 'RECENT'
        ELSE 'OLD'
    END as data_age
FROM disbursement_requests dr
JOIN partners p ON dr.partner_id = p.id
WHERE dr.created_at > NOW() - INTERVAL '7 days'
  AND (dr.utility_account_balance IS NOT NULL 
       OR dr.working_account_balance IS NOT NULL 
       OR dr.charges_account_balance IS NOT NULL)
ORDER BY dr.created_at DESC
LIMIT 10;

-- Check if we have any balance data from disbursements
SELECT 
    'BALANCE DATA AVAILABILITY' as check_type,
    COUNT(*) as total_disbursements,
    COUNT(CASE WHEN utility_account_balance IS NOT NULL THEN 1 END) as has_utility_balance,
    COUNT(CASE WHEN working_account_balance IS NOT NULL THEN 1 END) as has_working_balance,
    COUNT(CASE WHEN charges_account_balance IS NOT NULL THEN 1 END) as has_charges_balance,
    MAX(created_at) as latest_disbursement
FROM disbursement_requests 
WHERE created_at > NOW() - INTERVAL '7 days';

