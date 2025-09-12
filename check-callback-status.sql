-- Check current disbursement and callback status
-- Run this in Supabase Dashboard SQL Editor

-- 1. Check recent disbursements with conversation IDs
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
WHERE conversation_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check for any callback records
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

-- 3. Check disbursements without conversation IDs (failed M-Pesa calls)
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
WHERE conversation_id IS NULL
ORDER BY created_at DESC 
LIMIT 5;


