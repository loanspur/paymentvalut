-- Check the latest disbursement status
SELECT 
    id,
    status,
    conversation_id,
    result_code,
    result_desc,
    amount,
    msisdn,
    created_at,
    updated_at
FROM disbursement_requests 
WHERE id = '52ec506a-f84d-4245-ad90-9fd0c9daaf20'
ORDER BY created_at DESC;

-- Check if any callbacks were received
SELECT 
    id,
    callback_type,
    conversation_id,
    result_code,
    result_desc,
    receipt_number,
    transaction_amount,
    created_at
FROM mpesa_callbacks 
WHERE disbursement_id = '52ec506a-f84d-4245-ad90-9fd0c9daaf20'
ORDER BY created_at DESC;

-- Check all recent disbursements
SELECT 
    id,
    status,
    conversation_id,
    result_code,
    result_desc,
    amount,
    msisdn,
    created_at
FROM disbursement_requests 
ORDER BY created_at DESC 
LIMIT 5;


