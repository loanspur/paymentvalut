# Investigation: Why M-Pesa Callback Fields Are Null

## Current Situation

The API is returning:
- ✅ `conversation_id`: "AG_20251112_01001456123i4tov2f9v" (present)
- ❌ `mpesa_transaction_id`: null
- ❌ `mpesa_receipt_number`: null
- ❌ `mpesa_result_code`: null
- ❌ `mpesa_result_description`: null
- ❌ `mpesa_details`: [] (empty array)
- ⚠️ `status`: "accepted" (should be updated if callbacks exist)

## Root Cause Analysis

The empty `mpesa_details` array indicates that **no callbacks are being found** in the database for this transaction. This could be due to:

1. **Callbacks don't exist** - M-Pesa hasn't sent callbacks yet, or callbacks failed to be stored
2. **Callbacks exist but aren't matched** - Conversation ID mismatch or query issue
3. **Partner ID filtering** - Callbacks exist but have different/null partner_id

## Fixes Applied

### 1. Enhanced Logging
Added detailed console.log statements to track:
- Which conversation IDs are being checked
- The OR condition string being built
- How many callbacks the raw query returns
- Sample callback data structure
- Filtering results after partner_id check

### 2. Improved OR Condition Building
Changed from:
```typescript
const conversationOrConditions = conversationIdArray.map(id => 
  `conversation_id.eq.${id},originator_conversation_id.eq.${id}`
).join(',')
```

To:
```typescript
const conversationOrConditions = conversationIdArray.flatMap(id => [
  `conversation_id.eq.${id}`,
  `originator_conversation_id.eq.${id}`
]).join(',')
```

This ensures proper formatting of the OR conditions.

### 3. Status Update Logic
Added logic to update transaction status based on callback result codes:
- `result_code = '0'` → status = "success"
- `result_code = '1'` or `'1032'` → status = "failed"

## Next Steps

### Step 1: Run Diagnostic SQL Query
Run `diagnose_callback_issue.sql` in Supabase SQL Editor. This will show:
- If the disbursement request exists
- If any callbacks exist (with or without filters)
- Callback counts and partner_id distribution
- Recent callbacks for this partner

### Step 2: Deploy Updated Code
Deploy the updated code with enhanced logging.

### Step 3: Test API Again
```bash
curl -H "x-api-key:kulmangr_sk_live_mg4yhnjd_4b0c3c6j6u2x2y0s04731f1o0t4b344d6d0m2u" \
  "https://eazzypay.online/api/ussd/transaction-status?conversation_id=AG_20251112_01001456123i4tov2f9v"
```

### Step 4: Check Server Logs
Look for these log messages:
```
[USSD Transaction Status] Checking for callbacks with conversation IDs: [...]
[USSD Transaction Status] OR conditions string: ...
[USSD Transaction Status] Raw query returned X callbacks
[USSD Transaction Status] Sample callback data: {...}
[USSD Transaction Status] Found X callbacks for conversation IDs: [...]
[USSD Transaction Status] Filtered to X callbacks after partner_id check
[USSD Transaction Status] Found X callbacks for transaction: {...}
[USSD Transaction Status] No callbacks found for transaction: {...}
```

## Expected Outcomes

### Scenario A: Callbacks Don't Exist
**Logs will show:**
- `Raw query returned 0 callbacks`
- `No callbacks found for transaction`

**Action:** 
- Check M-Pesa callback endpoint logs
- Verify callbacks are being received and stored
- Check if transaction is still pending (status = "accepted" is expected)

### Scenario B: Callbacks Exist But Not Matched
**Logs will show:**
- `Raw query returned X callbacks` (where X > 0)
- But `Filtered to 0 callbacks after partner_id check` or `No callbacks found for transaction`

**Action:**
- Check the `Sample callback data` to see conversation_id/originator_conversation_id values
- Verify partner_id matches
- Check if conversation IDs in callbacks match the transaction

### Scenario C: Callbacks Found Successfully
**Logs will show:**
- `Raw query returned X callbacks`
- `Filtered to X callbacks after partner_id check`
- `Found X callbacks for transaction`

**Result:**
- M-Pesa fields should be populated
- Status should be updated to "success" or "failed"
- `mpesa_details` array should contain callback data

## Files Modified

- `app/api/ussd/transaction-status/route.ts`
  - Enhanced logging
  - Improved OR condition building
  - Status update logic based on callbacks

## Related Files

- `diagnose_callback_issue.sql` - Comprehensive diagnostic query
- `check_callback_matching.sql` - Basic callback check query
- `USSD_NULL_FIELDS_FIX.md` - Previous fix documentation

## Important Notes

1. **Transaction Status**: If status is "accepted", it means M-Pesa has accepted the request but hasn't sent a result callback yet. This is normal for pending transactions.

2. **Callback Timing**: M-Pesa callbacks can take several minutes to arrive. If the transaction was created recently, callbacks might not exist yet.

3. **Partner ID**: Some older callbacks might not have `partner_id` set. The code now handles this by including callbacks with null partner_id.

4. **Debugging**: The enhanced logging will help identify exactly where the issue is in the callback matching process.

