# 🔧 USSD Transaction Status API - Correct Endpoint

## ❌ What's Wrong

The USSD team is currently using:
```bash
curl -H "Content-Type:application/json" \
     -H "Authorization:Bearer <API KEY>" \
     https://mapgmmiobityxaaevomp.supabase.co/api/transactions/status?conversation_id=AG_20251004_010012230iskwo1l04rm
```

**Issues:**
1. ❌ Using Supabase URL (`mapgmmiobityxaaevomp.supabase.co`) instead of Next.js application URL
2. ❌ Using wrong endpoint (`/api/transactions/status`) instead of `/api/ussd/transaction-status`
3. ❌ Using wrong authentication header (`Authorization: Bearer`) instead of `x-api-key`

## ✅ Correct Usage

### Base URL
Use your **Next.js application URL**, not the Supabase URL:
- Production: `https://your-production-domain.com`
- Development: `http://localhost:3000`

### Correct Endpoint
```
GET /api/ussd/transaction-status
```

### Correct Authentication
Use the `x-api-key` header (not `Authorization: Bearer`):
```
x-api-key: [YOUR_API_KEY]
```

## ✅ Correct curl Command

```bash
curl -H "x-api-key: YOUR_API_KEY_HERE" \
     "https://YOUR_NEXTJS_APP_URL/api/ussd/transaction-status?conversation_id=AG_20251004_010012230iskwo1l04rm"
```

### Example (Production)
```bash
curl -H "x-api-key: your-api-key-here" \
     "https://yourdomain.com/api/ussd/transaction-status?conversation_id=AG_20251004_010012230iskwo1l04rm"
```

### Example (Development/Local)
```bash
curl -H "x-api-key: your-api-key-here" \
     "http://localhost:3000/api/ussd/transaction-status?conversation_id=AG_20251004_010012230iskwo1l04rm"
```

## 📋 Complete Examples

### 1. Check by Conversation ID
```bash
curl -H "x-api-key: YOUR_API_KEY" \
     "https://YOUR_APP_URL/api/ussd/transaction-status?conversation_id=AG_20251004_010012230iskwo1l04rm"
```

### 2. Check by Client Request ID
```bash
curl -H "x-api-key: YOUR_API_KEY" \
     "https://YOUR_APP_URL/api/ussd/transaction-status?client_request_id=KULMNA-2025-01-10-000123"
```

### 3. Check by Phone Number
```bash
curl -H "x-api-key: YOUR_API_KEY" \
     "https://YOUR_APP_URL/api/ussd/transaction-status?msisdn=254700000000"
```

### 4. Filter by Status
```bash
curl -H "x-api-key: YOUR_API_KEY" \
     "https://YOUR_APP_URL/api/ussd/transaction-status?status=success&limit=20"
```

## 🔑 Getting Your API Key

1. Contact your system administrator
2. API keys are stored in the `partners` table
3. Each partner has a unique API key
4. The API key is hashed using SHA-256 for security

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "partner": {
    "id": "partner-uuid",
    "name": "Partner Name"
  },
  "query": {
    "conversation_id": "AG_20251004_010012230iskwo1l04rm",
    "client_request_id": null,
    "msisdn": null,
    "transaction_id": null,
    "status": null,
    "limit": 50,
    "offset": 0
  },
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "transactions": [
    {
      "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
      "conversation_id": "AG_20251004_010012230iskwo1l04rm",
      "client_request_id": "KULMNA-2025-01-10-000123",
      "origin": "ussd",
      "tenant_id": "KULMNA_TENANT",
      "customer_id": "CUST456",
      "msisdn": "254700000000",
      "amount": 1200.00,
      "status": "success",
      "result_code": "0",
      "result_description": "The service request is processed successfully.",
      "transaction_receipt": "LG123456789",
      "created_at": "2025-01-10T12:34:56.789Z",
      "updated_at": "2025-01-10T12:35:02.123Z",
      "partner_id": "partner-uuid"
    }
  ],
  "statistics": {
    "total_transactions": 150,
    "successful_transactions": 142,
    "pending_transactions": 3,
    "failed_transactions": 5,
    "success_rate": "94.67",
    "total_amount": 180000.00,
    "successful_amount": 170400.00,
    "recent_activity_24h": 25
  }
}
```

### Error Response (Invalid API Key)
```json
{
  "success": false,
  "error": "Invalid API key",
  "error_code": "AUTH_1002"
}
```

### Error Response (Missing API Key)
```json
{
  "success": false,
  "error": "API key is required",
  "error_code": "AUTH_1001"
}
```

## ⚠️ Important Notes

1. **Never use the Supabase URL** - Always use your Next.js application URL
2. **Use `x-api-key` header** - Not `Authorization: Bearer`
3. **Use `/api/ussd/transaction-status`** - Not `/api/transactions/status`
4. **API keys are partner-specific** - Each partner has their own API key
5. **API keys are hashed** - The system compares SHA-256 hashes, not plain text

## 🐛 Troubleshooting

### Error: "requested path is invalid"
- ✅ Check that you're using the Next.js app URL, not Supabase URL
- ✅ Check that the endpoint is `/api/ussd/transaction-status`

### Error: "API key is required"
- ✅ Make sure you're using the `x-api-key` header (not `Authorization: Bearer`)
- ✅ Check that the header name is exactly `x-api-key` (case-sensitive)

### Error: "Invalid API key"
- ✅ Verify your API key is correct
- ✅ Contact your administrator to regenerate the API key if needed
- ✅ Ensure your partner account is active

