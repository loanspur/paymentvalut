# USSD Transaction Status - Null Fields Fix

## Issue
After deployment, USSD team is still getting null values for:
- `mpesa_transaction_id`
- `mpesa_receipt_number`
- `mpesa_result_code`
- `mpesa_result_description`
- `customer_name` (if applicable)
- Transaction status remains "accepted" instead of "success" or "failed"

## Root Causes Identified

### 1. Transaction Status Not Updated from Callbacks
The API was returning the transaction status from the database ("accepted") even when callback data existed that indicated success or failure.

### 2. Partner ID Filtering Too Strict
Callbacks might not have `partner_id` set (especially older callbacks), causing them to be filtered out.

### 3. Missing Status Update Logic
The response wasn't updating the status field based on callback result codes.

## Fixes Applied

### 1. Enhanced Status Update Logic
```typescript
// Now updates status based on callback result codes
if (primaryMpesa) {
  if (primaryMpesa.result_code === '0') {
    finalStatus = 'success'
  } else if (primaryMpesa.result_code === '1' || primaryMpesa.result_code === '1032') {
    finalStatus = 'failed'
  }
  // Also updates result_code and result_description from callbacks
}
```

### 2. Fixed Partner ID Filtering
```typescript
// Now includes callbacks with null partner_id (older callbacks)
const filteredCallbacks = callbackData.filter(callback => {
  const callbackPartnerId = callback.partner_id
  return !callbackPartnerId || callbackPartnerId === partnerId
})
```

### 3. Added Debug Logging
Added console.log statements to help debug:
- Number of callbacks found
- Which conversation IDs are being checked
- Whether callbacks are found for each transaction
- Available keys in the callback map

## Testing Steps

### 1. Check if Callbacks Exist
Run this SQL query in Supabase:
```sql
SELECT 
  id,
  conversation_id,
  originator_conversation_id,
  transaction_id,
  receipt_number,
  result_code,
  result_desc,
  partner_id,
  created_at
FROM mpesa_callbacks
WHERE conversation_id = 'AG_20251112_01001456123i4tov2f9v'
   OR originator_conversation_id = 'AG_20251112_01001456123i4tov2f9v'
   OR conversation_id = '012e-4077-9e75-d1e27265b99098043'
   OR originator_conversation_id = '012e-4077-9e75-d1e27265b99098043'
ORDER BY created_at DESC;
```

### 2. Test the API
```bash
curl -H 'x-api-key: <API_KEY>' \
  'https://eazzypay.online/api/ussd/transaction-status?conversation_id=AG_20251112_01001456123i4tov2f9v'
```

### 3. Check Server Logs
After making the API call, check your server logs for:
- `[USSD Transaction Status] Found X callbacks for conversation IDs`
- `[USSD Transaction Status] Filtered to X callbacks after partner_id check`
- `[USSD Transaction Status] Found X callbacks for transaction` or `No callbacks found for transaction`

## Expected Behavior After Fix

✅ **If callbacks exist:**
- `mpesa_transaction_id` should be populated
- `mpesa_receipt_number` should be populated
- `mpesa_result_code` should show the result code (0, 1, 1032, etc.)
- `mpesa_result_description` should show the description
- `status` should be updated to "success" or "failed" based on result code
- `mpesa_details` array should contain callback data

✅ **If no callbacks exist:**
- Fields will remain null (expected behavior)
- Status will remain "accepted" (transaction still pending)
- Debug logs will show "No callbacks found"

## Possible Scenarios

### Scenario 1: Callbacks Don't Exist
**Symptom:** All M-Pesa fields are null, status is "accepted"
**Cause:** M-Pesa hasn't sent callbacks yet, or callbacks failed to be stored
**Solution:** Check M-Pesa callback endpoint logs, verify callbacks are being received

### Scenario 2: Callbacks Exist But Not Matched
**Symptom:** Callbacks exist in database but API returns null
**Cause:** Conversation ID mismatch or partner_id filtering issue
**Solution:** Check debug logs, verify conversation_id and originator_conversation_id match

### Scenario 3: Callbacks Exist But Missing Data
**Symptom:** Some fields populated, others null
**Cause:** Callback data structure might be incomplete
**Solution:** Check `raw_callback_data` in database, verify callback processing logic

## Next Steps

1. **Deploy the updated code**
2. **Test with the same conversation_id**
3. **Check server logs** to see what's happening
4. **Run the SQL query** to verify callbacks exist
5. **If callbacks don't exist**, investigate why M-Pesa isn't sending callbacks

## Files Modified

- `app/api/ussd/transaction-status/route.ts`
  - Added status update logic based on callbacks
  - Fixed partner_id filtering to include null values
  - Added debug logging
  - Enhanced callback matching

## Related Files

- `check_callback_matching.sql` - SQL query to verify callback existence
- `USSD_TRANSACTION_STATUS_FIX.md` - Previous fix documentation

