-- Check the latest sandbox disbursement status
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
WHERE id = '3104a12d-a578-45be-9057-01cb5019c680'
ORDER BY created_at DESC;

-- Check if any callbacks were received for this sandbox transaction
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
WHERE disbursement_id = '3104a12d-a578-45be-9057-01cb5019c680'
ORDER BY created_at DESC;


