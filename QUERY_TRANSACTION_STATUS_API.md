# Query M-Pesa Transaction Status Using Partner Vault Credentials

## Overview

This API endpoint uses your partner's M-Pesa vault credentials (stored securely in the database) to query transaction status from Safaricom M-Pesa API.

## Endpoints

### 1. Query Single Transaction Status

**POST** `/api/mpesa/query-transaction-status`

Query a single transaction using its Originator Conversation ID.

#### Request Body

```json
{
  "originator_conversation_id": "012e-4077-9e75-d1e27265b99098043"
}
```

#### Example Request

```bash
curl -X POST "https://eazzypay.online/api/mpesa/query-transaction-status" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN" \
  -d '{
    "originator_conversation_id": "012e-4077-9e75-d1e27265b99098043"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Transaction status query initiated successfully",
  "query": {
    "originator_conversation_id": "012e-4077-9e75-d1e27265b99098043",
    "conversation_id": "AG_20251114_...",
    "originator_conversation_id_response": "012e-4077-9e75-d1e27265b99098043",
    "response_code": "0",
    "response_description": "Accept the service request successfully."
  },
  "note": "The actual transaction status will be sent to your callback URL. Check the callback endpoint for results.",
  "callback_url": "https://eazzypay.online/api/mpesa-callback/transaction-status-result"
}
```

### 2. Query Multiple Transaction Statuses (Batch)

**PUT** `/api/mpesa/query-transaction-status`

Query multiple transactions at once.

#### Request Body

```json
{
  "originator_conversation_ids": [
    "f2b1-40c1-a220-7619c6f034df793486",
    "e694-42b9-941a-9e925d007ac734845",
    "79a5-49d8-b115-ea418254912636475",
    "cd32-4f5a-9ec7-6c7b1af0e88e420409",
    "e18a-47cc-9cb2-f59cebf4e46d21005",
    "012e-4077-9e75-d1e27265b99098043"
  ]
}
```

#### Example Request

```bash
curl -X PUT "https://eazzypay.online/api/mpesa/query-transaction-status" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN" \
  -d '{
    "originator_conversation_ids": [
      "f2b1-40c1-a220-7619c6f034df793486",
      "e694-42b9-941a-9e925d007ac734845",
      "79a5-49d8-b115-ea418254912636475",
      "cd32-4f5a-9ec7-6c7b1af0e88e420409",
      "e18a-47cc-9cb2-f59cebf4e46d21005",
      "012e-4077-9e75-d1e27265b99098043"
    ]
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Initiated queries for 6 transactions",
  "results": [
    {
      "originator_conversation_id": "f2b1-40c1-a220-7619c6f034df793486",
      "success": true,
      "conversation_id": "AG_20251114_...",
      "response_code": "0",
      "response_description": "Accept the service request successfully."
    },
    {
      "originator_conversation_id": "e694-42b9-941a-9e925d007ac734845",
      "success": true,
      "conversation_id": "AG_20251114_...",
      "response_code": "0",
      "response_description": "Accept the service request successfully."
    }
    // ... more results
  ],
  "note": "The actual transaction statuses will be sent to your callback URL. Check the callback endpoint for results.",
  "callback_url": "https://eazzypay.online/api/mpesa-callback/transaction-status-result"
}
```

## Authentication

- **Required**: Valid JWT token in `auth_token` cookie
- **Partner Access**: Users can only query transactions for their own partner
- **Super Admin**: Can query any partner by including `partner_id` in request body

## How It Works

1. **Authenticates** the user and gets their partner_id
2. **Retrieves** M-Pesa credentials from the vault (encrypted storage)
3. **Decrypts** credentials using the vault passphrase
4. **Gets** M-Pesa OAuth access token
5. **Queries** M-Pesa Transaction Status API using Originator Conversation ID
6. **Returns** the query initiation response

## Important Notes

### Asynchronous Process

⚠️ **The query is asynchronous!** The API response only confirms that M-Pesa accepted your query. The actual transaction status is sent to your callback URL.

### Callback URL

The transaction status result will be sent to:
- **Result URL**: `/api/mpesa-callback/transaction-status-result`
- **Timeout URL**: `/api/mpesa-callback/transaction-status-timeout`

Make sure these endpoints are:
- ✅ Publicly accessible
- ✅ Return 200 OK status
- ✅ Properly configured

### Checking Results

After initiating queries, check:

1. **Callback Endpoint Logs**: Check server logs for incoming callbacks
2. **Database**: Check `mpesa_callbacks` table for stored results
3. **Transaction Status API**: Use `/api/ussd/transaction-status` to see updated status

### Rate Limiting

- Batch queries include a 2-second delay between each query
- Don't query the same transaction multiple times rapidly
- M-Pesa may rate limit if you query too frequently

## Example: Query All 6 Transactions

```bash
# Get your auth token first (from login)
AUTH_TOKEN="your_auth_token_here"

# Query all 6 transactions
curl -X PUT "https://eazzypay.online/api/mpesa/query-transaction-status" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=$AUTH_TOKEN" \
  -d '{
    "originator_conversation_ids": [
      "f2b1-40c1-a220-7619c6f034df793486",
      "e694-42b9-941a-9e925d007ac734845",
      "79a5-49d8-b115-ea418254912636475",
      "cd32-4f5a-9ec7-6c7b1af0e88e420409",
      "e18a-47cc-9cb2-f59cebf4e46d21005",
      "012e-4077-9e75-d1e27265b99098043"
    ]
  }'
```

## Response Codes

### Query Initiation Response

- **ResponseCode "0"** = Query accepted, result will be sent to callback
- **Other codes** = Query rejected (check ResponseDescription)

### Transaction Status Result (in Callback)

- **ResultCode 0** = Transaction successful (funds sent)
- **ResultCode 1** = Insufficient balance
- **ResultCode 1032** = Insufficient balance (M-Pesa)
- **Other codes** = Various failure reasons

## Troubleshooting

### Error: "Partner not found"
- Verify your user has a `partner_id` assigned
- Check if you're authenticated correctly

### Error: "No valid credentials found"
- Partner's M-Pesa credentials are not stored in vault
- Check partner settings in admin panel
- Verify credentials are encrypted and stored correctly

### Error: "Failed to get access token"
- M-Pesa credentials might be incorrect
- Check if environment (production/sandbox) matches
- Verify Consumer Key and Consumer Secret

### Error: "M-Pesa API error"
- Check the error message for details
- Verify Security Credential is correct
- Check if Shortcode and Initiator Name are correct

### No callback received
- Wait a few minutes (callbacks can take time)
- Check if callback URL is publicly accessible
- Verify callback endpoint returns 200 OK
- Check server logs for incoming requests

## Next Steps After Querying

1. **Wait 1-5 minutes** for M-Pesa to send callbacks
2. **Check callback endpoint logs** for incoming results
3. **Query database** to see stored results:
   ```sql
   SELECT * FROM mpesa_callbacks 
   WHERE callback_type = 'transaction_status_query'
   ORDER BY created_at DESC;
   ```
4. **Check transaction status API** to see updated status:
   ```bash
   curl "https://eazzypay.online/api/ussd/transaction-status?conversation_id=AG_20251112_01001456123i4tov2f9v" \
     -H "x-api-key: YOUR_API_KEY"
   ```

## Files Created

- `app/api/mpesa/query-transaction-status/route.ts` - Main API endpoint
- `app/api/mpesa-callback/transaction-status-result/route.ts` - Callback endpoint for results
- `app/api/mpesa-callback/transaction-status-timeout/route.ts` - Callback endpoint for timeouts
- `QUERY_TRANSACTION_STATUS_API.md` - This documentation

