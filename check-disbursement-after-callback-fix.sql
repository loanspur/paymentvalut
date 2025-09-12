-- Check if the disbursement was updated after the callback fix
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

-- Check if the callback was recorded
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


