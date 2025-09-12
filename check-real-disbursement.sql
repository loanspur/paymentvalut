-- Check the REAL disbursement status (not our test callback)
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
WHERE conversation_id = 'AG_1757617135809_fvd6cozw5'
ORDER BY created_at DESC;

-- Check if Safaricom sent any REAL callbacks for this conversation
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
WHERE conversation_id = 'AG_1757617135809_fvd6cozw5'
ORDER BY created_at DESC;


