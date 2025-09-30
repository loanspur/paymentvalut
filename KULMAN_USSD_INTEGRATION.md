# 🔑 Kulman Group Integration Details for USSD Team

## **1. API Endpoint**
```
POST https://your-project.supabase.co/functions/v1/disburse
```

## **2. Authentication**
- **Header**: `x-api-key`
- **Value**: `kulmna_sk_live_1234567890abcdef`

## **3. Request Format**
```json
{
  "amount": 1200,
  "msisdn": "2547XXXXXXXX",
  "tenant_id": "KULMNA_TENANT",
  "customer_id": "CUST456",
  "client_request_id": "KULMNA-2025-01-09-000123"
}
```

## **4. Request Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | ✅ | Amount to disburse (in KES) |
| `msisdn` | string | ✅ | Phone number in format `2547XXXXXXXX` |
| `tenant_id` | string | ✅ | Your tenant identifier |
| `customer_id` | string | ✅ | Customer identifier |
| `client_request_id` | string | ✅ | Unique request ID for tracking |

## **5. Response Format**
```json
{
  "success": true,
  "disbursement_id": "uuid",
  "conversation_id": "AG_2025...123",
  "status": "pending",
  "amount": 1200,
  "msisdn": "2547XXXXXXXX",
  "created_at": "2025-01-10T12:34:56Z"
}
```

## **6. Webhook Callbacks**
The system will send webhooks to your USSD backend when transactions complete:

**Webhook URL**: `https://your-ussd-backend.com/webhook/mpesa-callback`

**Webhook Payload**:
```json
{
  "disbursement_id": "uuid",
  "conversation_id": "AG_2025...123",
  "result_code": 0,
  "result_desc": "The service request is processed successfully.",
  "transaction_receipt": "LGXXXXXXX",
  "amount": 1200,
  "msisdn": "2547XXXXXXXX",
  "processed_at": "2025-01-10T12:34:56Z"
}
```

## **7. M-Pesa Configuration**
- **Short Code**: `3037935` (Production)
- **Environment**: `production`
- **Transaction Type**: B2C (Business to Customer)

## **8. Callback URLs (Internal)**
The system uses these internal callback URLs for M-Pesa:
- **Result Callback**: `https://your-project.supabase.co/functions/v1/mpesa-b2c-result`
- **Timeout Callback**: `https://your-project.supabase.co/functions/v1/mpesa-b2c-timeout`

## **9. Error Handling**
| HTTP Status | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (invalid API key) |
| 500 | Internal Server Error |

## **10. Testing Steps**
1. **Test API Key**: Verify authentication with a simple request
2. **Test Disbursement**: Send a small amount to a test number
3. **Test Webhook**: Verify your webhook endpoint receives callbacks
4. **Test Error Handling**: Try invalid requests to test error responses

## **11. Sample cURL Command**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: kulmna_sk_live_1234567890abcdef" \
  -d '{
    "amount": 100,
    "msisdn": "254712345678",
    "tenant_id": "KULMNA_TENANT",
    "customer_id": "TEST_CUST_001",
    "client_request_id": "KULMNA-TEST-2025-01-10-001"
  }'
```

## **12. Important Notes**
- Replace `your-project.supabase.co` with your actual Supabase project URL
- Replace `your-ussd-backend.com` with your actual USSD backend URL
- The system supports idempotency - duplicate requests with same `client_request_id` will return existing disbursement
- All transactions are logged for audit purposes
- Webhook failures are logged but don't fail the disbursement

## **13. Support Contacts**
- **Technical Support**: Check the system logs for debugging
- **M-Pesa Issues**: Verify credentials and shortcode configuration
- **Webhook Issues**: Ensure your endpoint is accessible and returns HTTP 200

---

**Document Version**: 1.0  
**Last Updated**: January 10, 2025  
**Partner**: Kulman Group Limited
