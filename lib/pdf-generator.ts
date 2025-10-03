// PDF Generator for API Documentation
// This creates a comprehensive PDF document with all API documentation sections

export interface APIDocSection {
  id: string
  title: string
  content: string
  subsections?: APIDocSection[]
}

export const generateAPIDocumentationPDF = (): string => {
  const sections: APIDocSection[] = [
    {
      id: 'overview',
      title: 'System Overview',
      content: `
# M-Pesa Vault API Documentation

## System Overview

The M-Pesa Vault system provides a comprehensive API for M-Pesa B2C disbursements with real-time balance monitoring and multi-tenant support.

### What This System Provides

- **M-Pesa B2C Disbursement** - Send money to customers via Supabase Edge Functions
- **Real-time Status Updates** - Track transaction progress with webhooks
- **Partner Management** - Multi-tenant support with role-based access
- **Balance Monitoring** - Real-time balance tracking and alerts
- **Transaction History** - Complete audit trail with utility balance tracking
- **User Management** - Enhanced user system with permissions and shortcode access

### Base URL
\`https://your-domain.com\`

### Authentication
\`x-api-key: partner_api_key\`

### Important Notes
- **Minimum Amount:** 10 KES (Safaricom requirement)
- **Architecture:** Supabase Edge Functions with PostgreSQL database
- **Callbacks:** Real-time webhook callbacks from Safaricom
- **Environment:** Production-ready with live M-Pesa integration
- **Balance Tracking:** Real-time utility balance monitoring per transaction
      `
    },
    {
      id: 'authentication',
      title: 'Authentication',
      content: `
# Authentication

## API Key Authentication

All API requests require a valid API key in the header.

\`\`\`
x-api-key: your_partner_api_key
\`\`\`

## Available Partners & API Keys

| Partner | Tenant ID | API Key | Status |
|---------|-----------|---------|--------|
| Kulman Group Limited | kulman | [API_KEY_HIDDEN] | Active |
| Finsef Limited | finsafe | [API_KEY_HIDDEN] | Active |
| ABC Limited | abc | [API_KEY_HIDDEN] | Active |

## Security Requirements

- **IP Whitelisting:** Your USSD server IPs must be whitelisted
- **HTTPS Only:** All API calls must use HTTPS
- **API Key Protection:** Never expose API keys in client-side code
- **Rate Limiting:** Respect API rate limits
      `
    },
    {
      id: 'disbursement',
      title: 'Send Money (Disbursement)',
      content: `
# Send Money (Disbursement)

## Endpoint
\`POST https://your-domain.com/api/disburse\`

## Request Headers
\`\`\`json
{
  "x-api-key": "[YOUR_API_KEY]",
  "Content-Type": "application/json"
}
\`\`\`

## Request Body
\`\`\`json
{
  "amount": 100,
  "msisdn": "254700000000",
  "tenant_id": "kulman",
  "customer_id": "customer_456",
  "client_request_id": "req_789",
  "occasion": "Payment for services"
}
\`\`\`

## Response (Success)
\`\`\`json
{
  "status": "accepted",
  "conversation_id": "AG_20250913_1234567890",
  "originator_conversation_id": "abc-123-def-456",
  "response_code": "0",
  "response_description": "Accept the service request successfully.",
  "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
  "partner_id": "partner_123",
  "utility_balance": 15000.00
}
\`\`\`

## Response (Insufficient Balance)
\`\`\`json
{
  "status": "rejected",
  "error_code": "BALANCE_1001",
  "error_message": "Insufficient balance in utility account",
  "current_balance": 5.00,
  "requested_amount": 100.00,
  "shortfall": 95.00,
  "conversation_id": null,
  "transaction_id": null
}
\`\`\`

## Response (Authentication Error)
\`\`\`json
{
  "status": "rejected",
  "error_code": "AUTH_1002",
  "error_message": "Invalid API key",
  "conversation_id": null,
  "transaction_id": null
}
\`\`\`

## Response (M-Pesa Error)
\`\`\`json
{
  "status": "rejected",
  "error_code": "MPESA_1001",
  "error_message": "Unable to lock subscriber",
  "mpesa_response_code": "1",
  "mpesa_response_description": "Unable to lock subscriber",
  "conversation_id": "AG_20250913_1234567890",
  "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26"
}
\`\`\`

## Response (Validation Error)
\`\`\`json
{
  "status": "rejected",
  "error_code": "VALIDATION_1001",
  "error_message": "Invalid phone number format",
  "details": {
    "field": "msisdn",
    "value": "25470000000",
    "expected_format": "254XXXXXXXXX (12 digits)"
  },
  "conversation_id": null,
  "transaction_id": null
}
\`\`\`

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | Yes | Amount in KES (minimum 10) |
| msisdn | string | Yes | Phone number (254XXXXXXXXX) |
| tenant_id | string | Yes | Partner identifier (kulman, finsafe, abc) |
| customer_id | string | Yes | Your internal customer ID |
| client_request_id | string | Yes | Unique request identifier |
| occasion | string | No | Transaction description |
      `
    },
    {
      id: 'status',
      title: 'Check Transaction Status',
      content: `
# Check Transaction Status

## Endpoint
\`GET https://your-domain.com/api/transactions/status\`

## Query Parameters
- \`conversation_id\` - M-Pesa conversation ID
- \`client_request_id\` - Your internal request ID
- \`phone\` - Customer phone number

## Example Request
\`\`\`bash
curl -H "x-api-key: [YOUR_API_KEY]" \\
  "https://your-domain.com/api/transactions/status?conversation_id=AG_20250913_1234567890"
\`\`\`

## Response
\`\`\`json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "count": 1,
  "transactions": [
    {
      "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
      "conversation_id": "AG_20250913_1234567890",
      "client_request_id": "req_789",
      "amount": 100,
      "phone": "254700000000",
      "status": "success",
      "result_code": "0",
      "result_description": "Transaction completed successfully",
      "transaction_receipt": "MPESA123456789",
      "receipt_number": "MPESA123456789",
      "mpesa_transaction_id": "MPESA123456789",
      "customer_name": "John Doe",
      "utility_balance_at_transaction": 14900.00,
      "working_balance_at_transaction": 5000.00,
      "charges_balance_at_transaction": 100.00,
      "balance_updated_at_transaction": "2025-09-13T09:02:31.325128+00:00",
      "created_at": "2025-09-13T09:02:29.048217+00:00",
      "updated_at": "2025-09-13T09:02:31.325128+00:00",
      "partner_id": "partner_123"
    }
  ],
  "timestamp": "2025-09-13T09:15:06.238Z"
}
\`\`\`

## Status Values

| Status | Description |
|--------|-------------|
| accepted | Transaction accepted by M-Pesa, processing |
| success | Transaction completed successfully |
| failed | Transaction failed |
| pending | Transaction pending |
      `
    },
    {
      id: 'webhooks',
      title: 'Webhook Callbacks',
      content: `
# Webhook Callbacks

## Real-time Transaction Updates

The system automatically receives webhook callbacks from Safaricom when transaction status changes. These callbacks update the transaction status, extract customer names, M-Pesa transaction IDs, and utility balances in real-time.

## Callback Endpoints
- \`/api/mpesa-callback/result\` - Success/failure callbacks
- \`/api/mpesa-callback/timeout\` - Timeout callbacks
- \`/api/mpesa-callback/validation\` - Validation callbacks

## Success Callback Payload
\`\`\`json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "abc-123-def-456",
    "ConversationID": "AG_20250913_1234567890",
    "TransactionID": "MPESA123456789",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "TransactionReceipt",
          "Value": "MPESA123456789"
        },
        {
          "Key": "TransactionAmount",
          "Value": 100
        },
        {
          "Key": "B2CWorkingAccountAvailableFunds",
          "Value": 5000.00
        },
        {
          "Key": "B2CUtilityAccountAvailableFunds",
          "Value": 14900.00
        },
        {
          "Key": "B2CChargesPaidAccountAvailableFunds",
          "Value": 100.00
        },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "John Doe"
        },
        {
          "Key": "TransactionCompletedDateTime",
          "Value": "13.09.2025 12:02:31"
        },
        {
          "Key": "B2CRecipientIsRegisteredCustomer",
          "Value": "Y"
        }
      ]
    }
  }
}
\`\`\`

## Data Extraction

The system automatically extracts the following data from callbacks:
- **M-Pesa Transaction ID:** From TransactionReceipt or TransactionID
- **Customer Name:** From ReceiverPartyPublicName
- **Utility Balance:** From B2CUtilityAccountAvailableFunds
- **Working Balance:** From B2CWorkingAccountAvailableFunds
- **Charges Balance:** From B2CChargesPaidAccountAvailableFunds
- **Transaction Status:** Based on ResultCode (0 = success, others = failed)

## Important Notes
- **Automatic Processing:** Callbacks are processed automatically by Supabase Edge Functions
- **Real-time Updates:** Transaction status updates happen within seconds of M-Pesa processing
- **Balance Tracking:** Utility balances are captured and stored with each transaction
- **Customer Names:** Names are extracted from M-Pesa's ReceiverPartyPublicName field
- **Idempotency:** Duplicate callbacks are handled gracefully
      `
    },
    {
      id: 'error-codes',
      title: 'Error Codes',
      content: `
# Error Codes

| Error Code | Message | Solution |
|------------|---------|----------|
| AUTH_1001 | API key required | Include x-api-key header |
| AUTH_1002 | Invalid API key | Check API key is correct |
| AUTH_1003 | IP address not whitelisted | Contact admin to whitelist your IP |
| B2C_1001 | Missing required fields | Check request body |
| B2C_1002 | Invalid amount (minimum 10 KES) | Use amount >= 10 |
| BALANCE_1001 | Insufficient balance in utility account | Top up account or reduce amount |
| MPESA_1001 | Unable to lock subscriber | Customer phone is busy, retry later |
| MPESA_1002 | Request cancelled by user | Customer cancelled the transaction |
| VALIDATION_1001 | Invalid phone number format | Use format 254XXXXXXXXX |
| VALIDATION_1002 | Missing required fields | Check request body for all required fields |
      `
    },
    {
      id: 'code-examples',
      title: 'Code Examples',
      content: `
# Code Examples

## JavaScript/Node.js

\`\`\`javascript
// Partner configurations
const PARTNERS = {
  kulman: {
    apiKey: "[YOUR_API_KEY]",
    tenantId: "kulman",
    baseUrl: "https://your-domain.com"
  },
  finsafe: {
    apiKey: "[YOUR_API_KEY]",
    tenantId: "finsafe",
    baseUrl: "https://your-domain.com"
  }
};

// Send money function
async function sendMoney(partner, amount, phone, clientRequestId) {
  const config = PARTNERS[partner];
  
  const response = await fetch(\`\${config.baseUrl}/api/disburse\`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amount,
      msisdn: phone,
      tenant_id: config.tenantId,
      customer_id: "customer_456",
      client_request_id: clientRequestId,
      occasion: \`\${partner} USSD Payment\`
    })
  });
  
  return await response.json();
}

// Check transaction status
async function checkTransactionStatus(conversationId, partner) {
  const config = PARTNERS[partner];
  
  const response = await fetch(
    \`\${config.baseUrl}/api/transactions/status?conversation_id=\${conversationId}\`,
    {
      headers: {
        'x-api-key': config.apiKey
      }
    }
  );
  
  return await response.json();
}

// Usage examples
// sendMoney('kulman', 100, '254700000000', 'req_123')
// checkTransactionStatus('AG_20250913_1234567890', 'kulman')
\`\`\`

## cURL Examples

### Send Money
\`\`\`bash
curl -X POST https://your-domain.com/api/disburse \\
  -H "x-api-key: [YOUR_API_KEY]" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "msisdn": "254700000000",
    "tenant_id": "kulman",
    "customer_id": "customer_456",
    "client_request_id": "req_789",
    "occasion": "Kulman USSD Payment"
  }'
\`\`\`

### Check Status
\`\`\`bash
curl -H "x-api-key: [YOUR_API_KEY]" \\
  "https://your-domain.com/api/transactions/status?conversation_id=AG_20250913_1234567890"
\`\`\`

## PHP Example

\`\`\`php
<?php
// Send money function
function sendMoney($partner, $amount, $phone, $clientRequestId) {
    $config = [
        'kulman' => [
            'apiKey' => '[YOUR_API_KEY]',
            'tenantId' => 'kulman'
        ],
        'finsafe' => [
            'apiKey' => '[YOUR_API_KEY]',
            'tenantId' => 'finsafe'
        ]
    ];
    
    $partnerConfig = $config[$partner];
    
    $data = [
        'amount' => $amount,
        'msisdn' => $phone,
        'tenant_id' => $partnerConfig['tenantId'],
        'customer_id' => 'customer_456',
        'client_request_id' => $clientRequestId,
        'occasion' => $partner . ' USSD Payment'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://your-domain.com/api/disburse');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'x-api-key: ' . $partnerConfig['apiKey'],
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Usage
$result = sendMoney('kulman', 100, '254700000000', 'req_123');
echo json_encode($result);
?>
\`\`\`
      `
    }
  ]

  // Generate markdown content
  let markdown = `# M-Pesa Vault API Documentation

Generated on: ${new Date().toLocaleDateString()}

---

`

  sections.forEach((section, index) => {
    markdown += section.content + '\n\n---\n\n'
  })

  markdown += `
# Support

For technical support or questions about the API, please contact:
- Email: support@your-domain.com
- Documentation: https://your-domain.com/api-docs

---

*This documentation is automatically generated and reflects the current state of the M-Pesa Vault API system.*
`

  return markdown
}

export const downloadMarkdownAsFile = (content: string, filename: string = 'mpesa-vault-api-documentation.md') => {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

