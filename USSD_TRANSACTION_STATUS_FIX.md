# USSD Transaction Status API Fix

## Issue Description

The USSD team was unable to retrieve M-Pesa callback data when checking transaction status using `conversation_id`. The API was returning transactions with status "accepted" but with empty `mpesa_details` arrays, even though callbacks might exist in the database.

## Root Cause

The API had three issues when matching M-Pesa callbacks to disbursement requests:

1. **Missing `originator_conversation_id` in initial lookup**: The code only collected `conversation_id` values from transactions, but not `originator_conversation_id`. M-Pesa callbacks can use either ID.

2. **Incomplete query**: The callback query only checked `conversation_id` field, not `originator_conversation_id`, so callbacks stored with `originator_conversation_id` were missed.

3. **Incomplete lookup key**: When mapping transactions to callbacks, the code only used `transaction.conversation_id` as the lookup key, not `transaction.originator_conversation_id`.

## Example Scenario

**Transaction:**
- `conversation_id`: `AG_20251112_01001456123i4tov2f9v`
- `originator_conversation_id`: `012e-4077-9e75-d1e27265b99098043`

**M-Pesa Callback:**
- `conversation_id`: `AG_20251112_01001456123i4tov2f9v` (or could be null)
- `originator_conversation_id`: `012e-4077-9e75-d1e27265b99098043`

**Problem**: If the callback's `conversation_id` was null or different, but `originator_conversation_id` matched, the callback wouldn't be found.

## Fix Applied

### 1. Enhanced ID Collection
```typescript
// Now collects both conversation_id and originator_conversation_id
transactions?.forEach(transaction => {
  if (transaction.conversation_id) {
    conversationIdsToCheck.add(transaction.conversation_id)
  }
  if (transaction.originator_conversation_id) {
    conversationIdsToCheck.add(transaction.originator_conversation_id)
  }
})
```

### 2. Enhanced Query
```typescript
// Now queries both conversation_id AND originator_conversation_id
const orConditions = conversationIdArray.map(id => 
  `conversation_id.eq.${id},originator_conversation_id.eq.${id}`
).join(',')

const { data: callbackData } = await supabase
  .from('mpesa_callbacks')
  .select('...')
  .eq('partner_id', partnerId)
  .or(orConditions)  // Checks both fields
```

### 3. Dual-Key Storage
```typescript
// Stores callbacks under both keys for flexible lookup
const conversationKey = callback.conversation_id || 'unknown'
const originatorKey = callback.originator_conversation_id || 'unknown'

// Store under conversation_id
mpesaCallbackMap[conversationKey].push(callbackEntry)

// Also store under originator_conversation_id if different
if (originatorKey !== 'unknown' && originatorKey !== conversationKey) {
  mpesaCallbackMap[originatorKey].push(callbackEntry)
}
```

### 4. Enhanced Lookup
```typescript
// Tries both conversation_id and originator_conversation_id when mapping
let mpesaDetails = mpesaCallbackMap[transaction.conversation_id || ''] || []
if (mpesaDetails.length === 0 && transaction.originator_conversation_id) {
  mpesaDetails = mpesaCallbackMap[transaction.originator_conversation_id] || []
}
```

## Testing

To verify the fix works:

1. **Run the SQL query** (`check_callback_matching.sql`) to see if callbacks exist for the transaction
2. **Test the API** with the same conversation_id:
   ```bash
   curl -H 'x-api-key: <API_KEY>' \
     'https://eazzypay.online/api/ussd/transaction-status?conversation_id=AG_20251112_01001456123i4tov2f9v'
   ```
3. **Verify the response** now includes:
   - `mpesa_details` array with callback data
   - `mpesa_result_code` and `mpesa_result_description`
   - `mpesa_transaction_id` and `mpesa_receipt_number`
   - Updated `status` field if callback indicates success/failure

## Expected Behavior After Fix

- ✅ Callbacks are found even if they only match by `originator_conversation_id`
- ✅ Transaction status is updated based on callback result codes
- ✅ Full M-Pesa transaction details are included in the response
- ✅ Multiple callbacks for the same transaction are all included

## Files Modified

- `app/api/ussd/transaction-status/route.ts` - Enhanced callback matching logic

## Related Files

- `check_callback_matching.sql` - SQL query to verify callback existence
- `check_ussd_transaction_ids.sql` - SQL query to check transaction status

