-- Check the latest disbursement status after InitiatorPassword implementation
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
WHERE id = '5ee1db82-5ff3-4523-8416-9443eb8f5323'
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
WHERE disbursement_id = '5ee1db82-5ff3-4523-8416-9443eb8f5323'
ORDER BY created_at DESC;

-- Check Kulman Group's current M-Pesa configuration
SELECT 
    id,
    name,
    mpesa_shortcode,
    mpesa_environment,
    mpesa_initiator_name,
    mpesa_initiator_password IS NOT NULL as has_initiator_password,
    is_mpesa_configured
FROM partners 
WHERE name = 'KULMAN GROUP';


