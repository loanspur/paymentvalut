# How to Verify if M-Pesa Sent Callbacks

## Overview

I cannot directly query M-Pesa's API from here, but I can help you verify in several ways:

1. **Check your database** - See if callbacks were received and stored
2. **Check server logs** - See if callback endpoints were hit
3. **Use M-Pesa Query API** - Query M-Pesa directly for transaction status
4. **Check M-Pesa Portal** - Use Safaricom's portal to verify transactions

## Method 1: Check Your Database (Recommended First Step)

Run the SQL query `check_mpesa_callback_receipt.sql` in Supabase. This will show:
- ✅ If callbacks exist in your database
- ✅ Exact matches for your conversation IDs
- ✅ Partial matches (similar IDs)
- ✅ Unmatched callbacks

**If callbacks are found in the database:**
- ✅ M-Pesa DID send callbacks
- ❌ Issue is with matching/linking to transactions

**If NO callbacks are found:**
- ❌ M-Pesa may not have sent callbacks
- ❌ Callbacks may have failed to reach your server
- ❌ Callbacks may have been received but not stored

## Method 2: Check Server Logs

Check your server logs for the callback endpoint: `/api/mpesa-callback/result`

Look for:
- POST requests to this endpoint around the transaction dates
- Any errors when processing callbacks
- HTTP status codes (200 = received, 4xx/5xx = errors)

**Where to check:**
- Vercel/Next.js logs (if deployed there)
- Server application logs
- API gateway logs
- Supabase Edge Function logs (if using Supabase functions)

**What to look for:**
```
POST /api/mpesa-callback/result
ConversationID: AG_20251106_010013530mw3zbg9t9ao
ResultCode: 0 (or 1, 1032, etc.)
```

## Method 3: Use M-Pesa Query API

M-Pesa provides a Transaction Status Query API. You can use it to check transaction status directly.

### Prerequisites:
- M-Pesa API credentials (Consumer Key, Consumer Secret)
- Access to M-Pesa Developer Portal

### Steps:

1. **Get Access Token:**
```bash
curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic <base64_encoded_credentials>"
```

2. **Query Transaction Status:**
```bash
curl -X POST "https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "Initiator": "<initiator_name>",
    "SecurityCredential": "<security_credential>",
    "CommandID": "TransactionStatusQuery",
    "TransactionID": "<transaction_id>",
    "PartyA": "<shortcode>",
    "IdentifierType": "4",
    "ResultURL": "<your_result_url>",
    "QueueTimeOutURL": "<your_timeout_url>",
    "Remarks": "Transaction Status Query",
    "Occasion": "<occasion>"
  }'
```

**Note:** For production, use: `https://api.safaricom.co.ke` instead of `sandbox`

### For Your Specific Transactions:

You'll need to query each conversation ID. However, M-Pesa's Query API typically requires:
- The **Transaction ID** (not conversation ID)
- Or the **Originator Conversation ID**

You can try querying with the Originator Conversation IDs from your transactions.

## Method 4: Check M-Pesa Portal (Safaricom)

If you have access to Safaricom's M-Pesa Business Portal:

1. Log in to the portal
2. Navigate to **Transaction Reports** or **B2C Transactions**
3. Search by:
   - Transaction date (November 6 and 12, 2025)
   - Phone numbers (the 6 clients)
   - Amounts (5000, 3931, 4500)
4. Check transaction status for each

## Method 5: Check Callback URL Configuration

Verify that your callback URL is correctly configured in M-Pesa:

1. **Check M-Pesa Developer Portal:**
   - Log in to https://developer.safaricom.co.ke
   - Check your app's callback URLs
   - Verify the Result URL is set correctly

2. **Test Callback Endpoint:**
   - Ensure `/api/mpesa-callback/result` is accessible
   - Test with a sample callback payload
   - Check if it returns 200 OK

## Method 6: Check Network/Firewall Issues

If callbacks aren't being received:

1. **Check Firewall Rules:**
   - Ensure M-Pesa IPs are whitelisted (if applicable)
   - Check if your server blocks incoming webhooks

2. **Check SSL/TLS:**
   - M-Pesa requires HTTPS for callbacks
   - Verify your SSL certificate is valid
   - Check if there are SSL errors in logs

3. **Check Server Availability:**
   - Was your server down when callbacks were sent?
   - Check uptime logs for November 6 and 12

## Expected Callback Format

M-Pesa callbacks typically look like this:

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "012e-4077-9e75-d1e27265b99098043",
    "ConversationID": "AG_20251112_01001456123i4tov2f9v",
    "TransactionID": "TJ4IM6IK6X",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "TransactionReceipt",
          "Value": "TJ4IM6IK6X"
        },
        {
          "Key": "TransactionAmount",
          "Value": "4500"
        },
        {
          "Key": "TransactionDate",
          "Value": "20251112164635"
        },
        {
          "Key": "B2CUtilityAccountAvailableFunds",
          "Value": "100000.00"
        },
        {
          "Key": "B2CWorkingAccountAvailableFunds",
          "Value": "50000.00"
        },
        {
          "Key": "B2CRecipientIsRegisteredCustomer",
          "Value": "Y"
        },
        {
          "Key": "B2CChargesPaidAccountAvailableFunds",
          "Value": "0.00"
        },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "254729399821 - RONOH GILBERT CHERUIYOT"
        }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": [
        {
          "Key": "QueueTimeoutURL",
          "Value": "https://your-server.com/api/mpesa-callback/timeout"
        }
      ]
    }
  }
}
```

## Next Steps

1. **Run the SQL query** (`check_mpesa_callback_receipt.sql`) first
2. **Check server logs** for callback endpoint activity
3. **If no callbacks found**, use M-Pesa Query API or Portal to verify
4. **If callbacks exist but not matched**, fix the matching logic (we've already improved this)

## Important Notes

- **Result Code 0** = Success (funds sent)
- **Result Code 1** = Insufficient balance
- **Result Code 1032** = Insufficient balance (M-Pesa)
- **Other codes** = Various failure reasons

- Callbacks are usually sent within **1-5 minutes** of transaction initiation
- If callbacks aren't received within **24 hours**, they likely weren't sent
- Some transactions may timeout if not processed quickly

## Contact M-Pesa Support

If you confirm callbacks weren't sent:
- Contact Safaricom M-Pesa Business Support
- Provide the conversation IDs and transaction dates
- Request callback delivery logs
- Ask them to resend callbacks if possible

