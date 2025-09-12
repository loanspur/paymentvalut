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
WHERE id = 'c88ab8f5-6c02-4ea4-9ae8-a1f587507e4f'
ORDER BY created_at DESC;

-- Check if any callbacks were received for this disbursement
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
WHERE disbursement_id = 'c88ab8f5-6c02-4ea4-9ae8-a1f587507e4f'
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
LIMIT 3;


