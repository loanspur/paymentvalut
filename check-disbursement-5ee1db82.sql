-- Check the specific disbursement status and callbacks
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
WHERE id = '5ee1db82-5ff3-4523-8416-9443eb8f5323';

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
WHERE disbursement_id = '5ee1db82-5ff3-4523-8416-9443eb8f5323'
ORDER BY created_at DESC;

-- Check all recent callbacks to see if any were received
SELECT 
    id,
    callback_type,
    conversation_id,
    result_code,
    result_desc,
    created_at
FROM mpesa_callbacks 
ORDER BY created_at DESC 
LIMIT 10;


