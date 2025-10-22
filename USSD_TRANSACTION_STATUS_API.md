# 🔍 USSD Transaction Status API Documentation

## Overview
This API endpoint is specifically designed for the USSD team to check transaction statuses with enhanced features including bulk lookups, comprehensive statistics, and detailed transaction information.

## Base URL
```
https://your-domain.com/api/ussd/transaction-status
```

## Authentication
All requests must include an API key in the header:
```
x-api-key: [YOUR_API_KEY]
```

---

## 📋 GET - Check Transaction Status

### Endpoint
```
GET /api/ussd/transaction-status
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string | No | M-Pesa conversation ID |
| `client_request_id` | string | No | Your internal request ID |
| `msisdn` | string | No | Customer phone number (254XXXXXXXXX) |
| `transaction_id` | string | No | Internal transaction UUID |
| `status` | string | No | Filter by status (queued, accepted, success, failed) |
| `limit` | integer | No | Number of results per page (default: 50, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

### Example Requests

#### 1. Check by Conversation ID
```bash
curl -H "x-api-key: [YOUR_API_KEY]" \
  "https://your-domain.com/api/ussd/transaction-status?conversation_id=AG_20250110_1234567890"
```

#### 2. Check by Client Request ID
```bash
curl -H "x-api-key: [YOUR_API_KEY]" \
  "https://your-domain.com/api/ussd/transaction-status?client_request_id=KULMNA-2025-01-10-000123"
```

#### 3. Check by Phone Number
```bash
curl -H "x-api-key: [YOUR_API_KEY]" \
  "https://your-domain.com/api/ussd/transaction-status?msisdn=254700000000"
```

#### 4. Check Failed Transactions
```bash
curl -H "x-api-key: [YOUR_API_KEY]" \
  "https://your-domain.com/api/ussd/transaction-status?status=failed&limit=20"
```

#### 5. Paginated Results
```bash
curl -H "x-api-key: [YOUR_API_KEY]" \
  "https://your-domain.com/api/ussd/transaction-status?limit=10&offset=20"
```

### Response Format

```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "partner": {
    "id": "partner-uuid",
    "name": "Partner Name"
  },
  "query": {
    "conversation_id": "AG_20250110_1234567890",
    "client_request_id": null,
    "msisdn": null,
    "transaction_id": null,
    "status": null,
    "limit": 50,
    "offset": 0
  },
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "transactions": [
    {
      "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
      "conversation_id": "AG_20250110_1234567890",
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
  },
  "status_definitions": {
    "queued": "Transaction is queued for processing",
    "accepted": "Transaction accepted by M-Pesa, processing",
    "success": "Transaction completed successfully",
    "failed": "Transaction failed"
  },
  "timestamp": "2025-01-10T12:45:30.456Z"
}
```

---

## 📦 POST - Bulk Transaction Status Check

### Endpoint
```
POST /api/ussd/transaction-status
```

### Request Body

```json
{
  "transaction_ids": ["uuid1", "uuid2", "uuid3"],
  "conversation_ids": ["AG_20250110_1234567890", "AG_20250110_0987654321"],
  "client_request_ids": ["KULMNA-2025-01-10-000123", "KULMNA-2025-01-10-000124"]
}
```

### Example Request

```bash
curl -X POST \
  -H "x-api-key: [YOUR_API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_ids": ["AG_20250110_1234567890", "AG_20250110_0987654321"],
    "client_request_ids": ["KULMNA-2025-01-10-000123"]
  }' \
  "https://your-domain.com/api/ussd/transaction-status"
```

### Response Format

```json
{
  "success": true,
  "message": "Bulk transaction status retrieved successfully",
  "partner": {
    "id": "partner-uuid",
    "name": "Partner Name"
  },
  "query": {
    "transaction_ids": [],
    "conversation_ids": ["AG_20250110_1234567890", "AG_20250110_0987654321"],
    "client_request_ids": ["KULMNA-2025-01-10-000123"]
  },
  "count": 3,
  "transactions": [
    {
      "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
      "conversation_id": "AG_20250110_1234567890",
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
  "timestamp": "2025-01-10T12:45:30.456Z"
}
```

---

## 🚨 Error Responses

### Authentication Errors

#### Missing API Key
```json
{
  "success": false,
  "error": "API key is required",
  "error_code": "AUTH_1001"
}
```

#### Invalid API Key
```json
{
  "success": false,
  "error": "Invalid API key",
  "error_code": "AUTH_1002"
}
```

### Validation Errors

#### Missing Required Fields (POST)
```json
{
  "success": false,
  "error": "At least one of transaction_ids, conversation_ids, or client_request_ids is required",
  "error_code": "VALIDATION_1001"
}
```

### Server Errors

#### Database Error
```json
{
  "success": false,
  "error": "Failed to fetch transactions",
  "error_code": "DB_1001"
}
```

#### Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "error_code": "SERVER_1001"
}
```

---

## 📊 Status Definitions

| Status | Description | Next Steps |
|--------|-------------|------------|
| `queued` | Transaction is queued for processing | Wait for status update |
| `accepted` | Transaction accepted by M-Pesa, processing | Wait for completion |
| `success` | Transaction completed successfully | ✅ Complete |
| `failed` | Transaction failed | Check result_description for details |

---

## 🔧 Integration Examples

### JavaScript/Node.js
```javascript
const checkTransactionStatus = async (conversationId, apiKey) => {
  try {
    const response = await fetch(
      `https://your-domain.com/api/ussd/transaction-status?conversation_id=${conversationId}`,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      return data.transactions[0]; // First transaction
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error checking transaction status:', error);
    throw error;
  }
};

// Usage
const transaction = await checkTransactionStatus('AG_20250110_1234567890', 'your-api-key');
console.log('Transaction status:', transaction.status);
```

### Python
```python
import requests

def check_transaction_status(conversation_id, api_key):
    url = f"https://your-domain.com/api/ussd/transaction-status"
    headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
    }
    params = {
        'conversation_id': conversation_id
    }
    
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    
    if data['success']:
        return data['transactions'][0]  # First transaction
    else:
        raise Exception(data['error'])

# Usage
transaction = check_transaction_status('AG_20250110_1234567890', 'your-api-key')
print(f"Transaction status: {transaction['status']}")
```

### PHP
```php
<?php
function checkTransactionStatus($conversationId, $apiKey) {
    $url = "https://your-domain.com/api/ussd/transaction-status";
    $params = http_build_query(['conversation_id' => $conversationId]);
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'x-api-key: ' . $apiKey,
                'Content-Type: application/json'
            ]
        ]
    ]);
    
    $response = file_get_contents($url . '?' . $params, false, $context);
    $data = json_decode($response, true);
    
    if ($data['success']) {
        return $data['transactions'][0]; // First transaction
    } else {
        throw new Exception($data['error']);
    }
}

// Usage
try {
    $transaction = checkTransactionStatus('AG_20250110_1234567890', 'your-api-key');
    echo "Transaction status: " . $transaction['status'];
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

---

## 📈 Rate Limits

- **GET requests**: 100 requests per minute per API key
- **POST requests**: 50 requests per minute per API key
- **Bulk requests**: Maximum 100 transaction IDs per request

---

## 🔄 Webhook Integration

For real-time updates, consider implementing webhook callbacks. The system will send webhooks to your configured endpoint when transaction statuses change.

**Webhook URL**: `https://your-ussd-backend.com/webhook/transaction-status`

**Webhook Payload**:
```json
{
  "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
  "conversation_id": "AG_20250110_1234567890",
  "client_request_id": "KULMNA-2025-01-10-000123",
  "status": "success",
  "result_code": "0",
  "result_description": "The service request is processed successfully.",
  "transaction_receipt": "LG123456789",
  "updated_at": "2025-01-10T12:35:02.123Z"
}
```

---

## 🆘 Support

For technical support or questions about this API:
- **Email**: support@your-domain.com
- **Documentation**: https://your-domain.com/api-docs
- **Status Page**: https://status.your-domain.com

---

## 📝 Changelog

### Version 1.0.0 (2025-01-10)
- Initial release
- GET endpoint for single and bulk transaction status checking
- POST endpoint for bulk lookups
- Comprehensive statistics and pagination
- Enhanced error handling and validation
