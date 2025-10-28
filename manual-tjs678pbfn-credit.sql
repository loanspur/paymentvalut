-- MANUAL TJS678PBFN TRANSACTION PROCESSING
-- Run this script ONLY if the TJS678PBFN transaction was not processed automatically
-- This will manually credit the Ksh 2.00 to Finsafe's wallet

-- WARNING: Only run this if you're sure the transaction wasn't processed!
-- Check the investigation queries first to confirm the transaction is missing

-- Step 1: Get Finsafe partner ID (run this first to get the partner_id)
SELECT 
    'Finsafe Partner ID' as step,
    p.id as partner_id,
    p.name as partner_name,
    p.short_code
FROM partners p
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%';

-- Step 2: Check current wallet balance (run this to see current balance)
SELECT 
    'Current Wallet Balance' as step,
    pw.id as wallet_id,
    pw.partner_id,
    pw.current_balance,
    pw.last_topup_date,
    pw.last_topup_amount
FROM partner_wallets pw
JOIN partners p ON pw.partner_id = p.id
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%';

-- Step 3: Create C2B transaction record (replace 'PARTNER_ID_HERE' with actual partner ID)
/*
INSERT INTO c2b_transactions (
    partner_id,
    transaction_id,
    transaction_type,
    transaction_time,
    amount,
    business_short_code,
    bill_reference_number,
    customer_phone,
    customer_name,
    status,
    raw_notification,
    created_at,
    updated_at
) VALUES (
    'PARTNER_ID_HERE', -- Replace with actual Finsafe partner ID
    'TJS678PBFN',
    'PAYBILL',
    NOW(),
    2.00,
    '774451',
    'FINSAFE',
    '254727638940',
    'JUSTUS MURENGA WANJALA',
    'completed',
    '{"TransID": "TJS678PBFN", "TransAmount": "2.00", "BusinessShortCode": "774451", "BillRefNumber": "FINSAFE", "Mobile": "254727638940", "name": "JUSTUS MURENGA WANJALA", "manual_credit": true}',
    NOW(),
    NOW()
);
*/

-- Step 4: Update wallet balance (replace 'PARTNER_ID_HERE' with actual partner ID)
/*
UPDATE partner_wallets 
SET 
    current_balance = current_balance + 2.00,
    last_topup_date = NOW(),
    last_topup_amount = 2.00,
    updated_at = NOW()
WHERE partner_id = 'PARTNER_ID_HERE'; -- Replace with actual Finsafe partner ID
*/

-- Step 5: Create wallet transaction record (replace 'WALLET_ID_HERE' with actual wallet ID)
/*
INSERT INTO wallet_transactions (
    wallet_id,
    transaction_type,
    amount,
    reference,
    description,
    status,
    metadata,
    created_at,
    updated_at
) VALUES (
    'WALLET_ID_HERE', -- Replace with actual wallet ID
    'top_up',
    2.00,
    'TJS678PBFN',
    'Manual credit for TJS678PBFN - Paybill payment from 254727638940',
    'completed',
    '{"manual_credit": true, "original_transaction": "TJS678PBFN", "customer_name": "JUSTUS MURENGA WANJALA", "phone": "254727638940"}',
    NOW(),
    NOW()
);
*/

-- Step 6: Verify the manual credit (run this after steps 3-5)
SELECT 
    'Verification After Manual Credit' as step,
    pw.current_balance,
    pw.last_topup_date,
    pw.last_topup_amount,
    wt.reference,
    wt.amount,
    wt.created_at
FROM partner_wallets pw
JOIN partners p ON pw.partner_id = p.id
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id AND wt.reference = 'TJS678PBFN'
WHERE p.name ILIKE '%finsafe%' 
   OR p.short_code ILIKE '%finsafe%';

-- INSTRUCTIONS:
-- 1. First run the investigation queries to confirm TJS678PBFN is missing
-- 2. Get the Finsafe partner_id from Step 1
-- 3. Get the wallet_id from Step 2  
-- 4. Uncomment and run Steps 3-5 with the actual IDs
-- 5. Run Step 6 to verify the credit was applied
