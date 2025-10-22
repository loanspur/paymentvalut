-- Check recent disbursements to see what initiator names are working
SELECT 
    'RECENT DISBURSEMENTS' as check_type,
    dr.id,
    dr.partner_id,
    p.name as partner_name,
    p.mpesa_shortcode,
    p.mpesa_initiator_name,
    dr.status,
    dr.created_at,
    dr.updated_at,
    CASE 
        WHEN dr.created_at > NOW() - INTERVAL '24 hours' THEN 'RECENT'
        WHEN dr.created_at > NOW() - INTERVAL '7 days' THEN 'THIS_WEEK'
        ELSE 'OLDER'
    END as age
FROM disbursement_requests dr
JOIN partners p ON dr.partner_id = p.id
WHERE dr.created_at > NOW() - INTERVAL '7 days'
ORDER BY dr.created_at DESC
LIMIT 10;

-- Check if there are any successful disbursements
SELECT 
    'SUCCESSFUL DISBURSEMENTS' as check_type,
    COUNT(*) as total_disbursements,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM disbursement_requests 
WHERE created_at > NOW() - INTERVAL '7 days';

