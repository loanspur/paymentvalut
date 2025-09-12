-- Check the latest disbursement and its callbacks
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
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any callbacks were received for recent disbursements
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
ORDER BY created_at DESC 
LIMIT 10;