# How to Query M-Pesa Transaction Status Using Originator Conversation ID

## Overview

This guide explains how to query M-Pesa transaction status using the Originator Conversation ID to verify if transactions were processed and if callbacks were sent.

## Method 1: Using the Node.js Script (Recommended)

### Prerequisites

1. Node.js installed
2. M-Pesa API credentials:
   - Consumer Key
   - Consumer Secret
   - Security Credential
   - Initiator Name
   - Shortcode

### Setup

1. **Set Environment Variables:**

```bash
export MPESA_CONSUMER_KEY="your_consumer_key"
export MPESA_CONSUMER_SECRET="your_consumer_secret"
export MPESA_SECURITY_CREDENTIAL="your_security_credential"
export MPESA_INITIATOR_NAME="your_initiator_name"
export MPESA_SHORTCODE="your_shortcode"
export MPESA_ENVIRONMENT="production"  # or "sandbox"
export MPESA_RESULT_URL="https://your-domain.com/api/mpesa-callback/transaction-status-result"
export MPESA_TIMEOUT_URL="https://your-domain.com/api/mpesa-callback/transaction-status-timeout"
```

2. **Run the Script:**

```bash
node scripts/query-mpesa-transaction-status.js <originator_conversation_id>
```

### Example

```bash
# Query transaction status for a specific Originator Conversation ID
node scripts/query-mpesa-transaction-status.js 012e-4077-9e75-d1e27265b99098043
```

### Expected Output

```
🔐 Getting M-Pesa access token...
✅ Access token obtained

📡 Querying transaction status for Originator Conversation ID: 012e-4077-9e75-d1e27265b99098043
🌍 Environment: production

✅ Transaction Status Query Initiated Successfully!

📋 Response:
{
  "ConversationID": "AG_20251114_...",
  "OriginatorConversationID": "012e-4077-9e75-d1e27265b99098043",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}

✅ Query accepted by M-Pesa
📞 Conversation ID: AG_20251114_...
📞 Originator Conversation ID: 012e-4077-9e75-d1e27265b99098043

⏳ The result will be sent to your callback URL: https://your-domain.com/api/mpesa-callback/transaction-status-result
   Check your callback endpoint for the transaction status.
```

## Method 2: Using cURL

### Step 1: Get Access Token

```bash
CONSUMER_KEY="your_consumer_key"
CONSUMER_SECRET="your_consumer_secret"

# For production
AUTH=$(echo -n "$CONSUMER_KEY:$CONSUMER_SECRET" | base64)
ACCESS_TOKEN=$(curl -X GET "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic $AUTH" | jq -r '.access_token')

# For sandbox
# ACCESS_TOKEN=$(curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
#   -H "Authorization: Basic $AUTH" | jq -r '.access_token')
```

### Step 2: Query Transaction Status

```bash
ORIGINATOR_CONVERSATION_ID="012e-4077-9e75-d1e27265b99098043"
INITIATOR_NAME="your_initiator_name"
SECURITY_CREDENTIAL="your_security_credential"
SHORTCODE="your_shortcode"
RESULT_URL="https://your-domain.com/api/mpesa-callback/transaction-status-result"
TIMEOUT_URL="https://your-domain.com/api/mpesa-callback/transaction-status-timeout"

# For production
curl -X POST "https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Initiator": "'"$INITIATOR_NAME"'",
    "SecurityCredential": "'"$SECURITY_CREDENTIAL"'",
    "CommandID": "TransactionStatusQuery",
    "TransactionID": "'"$ORIGINATOR_CONVERSATION_ID"'",
    "PartyA": "'"$SHORTCODE"'",
    "IdentifierType": "4",
    "ResultURL": "'"$RESULT_URL"'",
    "QueueTimeOutURL": "'"$TIMEOUT_URL"'",
    "Remarks": "Transaction Status Query",
    "Occasion": "StatusQuery_'$(date +%s)'"
  }'

# For sandbox
# curl -X POST "https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query" \
#   ... (same as above)
```

## Method 3: Using the API Endpoint (If Available)

If you have an API endpoint set up, you can call it directly:

```bash
curl -X POST "https://your-domain.com/api/mpesa/query-transaction-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "originator_conversation_id": "012e-4077-9e75-d1e27265b99098043"
  }'
```

## Understanding the Response

### Initial Query Response

When you initiate the query, M-Pesa returns:

```json
{
  "ConversationID": "AG_20251114_...",
  "OriginatorConversationID": "012e-4077-9e75-d1e27265b99098043",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

- **ResponseCode "0"** = Query accepted, result will be sent to callback URL
- **Other codes** = Query rejected (check ResponseDescription)

### Callback Response

The actual transaction status is sent to your callback URL (`MPESA_RESULT_URL`). The callback contains:

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "012e-4077-9e75-d1e27265b99098043",
    "ConversationID": "AG_20251114_...",
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
    }
  }
}
```

### Result Code Meanings

- **ResultCode 0** = Transaction successful (funds sent)
- **ResultCode 1** = Insufficient balance
- **ResultCode 1032** = Insufficient balance (M-Pesa)
- **Other codes** = Various failure reasons (check ResultDesc)

## Querying Multiple Transactions

To query all 6 transactions, create a script:

```bash
#!/bin/bash

ORIGINATOR_IDS=(
  "f2b1-40c1-a220-7619c6f034df793486"
  "e694-42b9-941a-9e925d007ac734845"
  "79a5-49d8-b115-ea418254912636475"
  "cd32-4f5a-9ec7-6c7b1af0e88e420409"
  "e18a-47cc-9cb2-f59cebf4e46d21005"
  "012e-4077-9e75-d1e27265b99098043"
)

for id in "${ORIGINATOR_IDS[@]}"; do
  echo "Querying: $id"
  node scripts/query-mpesa-transaction-status.js "$id"
  echo "---"
  sleep 2  # Wait 2 seconds between queries
done
```

## Important Notes

1. **Asynchronous Process**: The Transaction Status Query API is asynchronous. The initial response only confirms the query was accepted. The actual status is sent to your callback URL.

2. **Callback URL Must Be Accessible**: Your callback URL must be publicly accessible and return 200 OK. M-Pesa will retry if it fails.

3. **Rate Limiting**: Don't query too frequently. Wait a few seconds between queries.

4. **Security Credential**: This must be the encrypted security credential, not the plain password. It's usually generated using the M-Pesa certificate.

5. **Transaction ID vs Originator Conversation ID**: 
   - The API accepts both, but using Originator Conversation ID is more reliable
   - Some transactions might not have a Transaction ID yet if they're still pending

## Troubleshooting

### Error: "Invalid credentials"
- Verify your Consumer Key and Consumer Secret
- Check if you're using the correct environment (production vs sandbox)

### Error: "Invalid security credential"
- Ensure you're using the encrypted security credential, not the plain password
- Regenerate the security credential if needed

### No callback received
- Check if your callback URL is publicly accessible
- Verify the URL returns 200 OK
- Check server logs for incoming requests
- Wait a few minutes - callbacks can take time

### Query accepted but no result
- Check your callback endpoint logs
- Verify the callback URL is correct
- Check if M-Pesa can reach your server (firewall/network issues)

## Files Created

1. **`scripts/query-mpesa-transaction-status.js`** - Node.js script to query transaction status
2. **`app/api/mpesa-callback/transaction-status-result/route.ts`** - Callback endpoint to receive query results
3. **`QUERY_MPESA_TRANSACTION_STATUS.md`** - This documentation

## Next Steps

1. Set up your environment variables
2. Run the script for each Originator Conversation ID
3. Check your callback endpoint for results
4. Review the transaction status in your database (stored in `mpesa_callbacks` table)

