# Missing Callbacks Management UI - Summary

## Overview

A comprehensive UI has been created for super admins to manage missing M-Pesa callbacks. This allows you to:
1. View transactions without callbacks
2. Upload CSV files with originator_conversation_ids
3. Query Safaricom M-Pesa API for transaction status
4. Send webhooks to USSD team with transaction results

## Features

### 1. View Transactions Without Callbacks
- Automatically lists all disbursement requests that don't have matching M-Pesa callbacks
- Shows customer name, phone number, amount, status, and conversation IDs
- Filterable by partner, status, and searchable by various fields
- Displays when transactions were created

### 2. CSV Upload
- Upload CSV files with originator_conversation_ids
- Supports flexible column names (originator_conversation_id, Originator Conversation ID, etc.)
- Validates and parses CSV data
- Provides CSV template download
- Batch query all uploaded IDs

### 3. Query Safaricom M-Pesa API
- Query single transaction by clicking the search icon
- Batch query selected transactions
- Batch query all uploaded CSV IDs
- Uses partner vault credentials automatically
- Shows query status (success/failed)
- Results arrive via callback (asynchronous)

### 4. Send Webhook to USSD Team
- Send transaction status to USSD team via webhook
- Uses configured USSD_WEBHOOK_URL
- Includes all transaction details and callback data
- Shows webhook delivery status

## Files Created

### 1. API Endpoints

#### `/api/admin/missing-callbacks` (GET)
- Returns transactions without M-Pesa callbacks
- Supports filtering by partner_id and status
- Supports pagination
- Only accessible to super_admin

#### `/api/admin/missing-callbacks/send-webhook` (POST)
- Sends webhook to USSD team with transaction status
- Includes transaction details and callback data
- Only accessible to super_admin

### 2. UI Components

#### `/management/missing-callbacks` (Page)
- Main management interface
- CSV upload functionality
- Transaction list with filters
- Query and webhook actions
- Results display

### 3. Navigation

- Added "Missing Callbacks" menu item under Management section
- Only visible to super_admin users
- Uses AlertCircle icon

## How to Use

### Step 1: Access the Page
1. Log in as super_admin
2. Navigate to **Management** → **Missing Callbacks** in the sidebar

### Step 2: View Transactions Without Callbacks
- The page automatically loads transactions without callbacks
- Use filters to narrow down results
- Search by conversation ID, customer name, phone number, etc.

### Step 3: Upload CSV (Optional)
1. Click "Template" to download CSV template
2. Fill in originator_conversation_ids (one per row)
3. Upload the CSV file
4. Click "Query All" to query all IDs at once

### Step 4: Query Transaction Status
**Option A: Query Single Transaction**
- Click the search icon (🔍) next to a transaction
- Query will be sent to Safaricom
- Results will arrive via callback (check back in a few minutes)

**Option B: Query Multiple Transactions**
- Select transactions using checkboxes
- Click "Query Selected" button
- Or upload CSV and click "Query All"

### Step 5: Send Webhook to USSD Team
- After querying (or if you already have callback data)
- Click the send icon (📤) next to a transaction
- Webhook will be sent to USSD team with transaction status

## CSV Format

The CSV should have a column with originator_conversation_ids. Supported column names:
- `originator_conversation_id`
- `Originator Conversation ID`
- `ORIGINATOR_CONVERSATION_ID`
- First column (if no header matches)

**Example CSV:**
```csv
originator_conversation_id
012e-4077-9e75-d1e27265b99098043
f2b1-40c1-a220-7619c6f034df793486
e694-42b9-941a-9e925d007ac734845
```

## Webhook Payload

When sending webhook to USSD team, the following payload is sent:

```json
{
  "disbursement_id": "uuid",
  "conversation_id": "AG_20251112_...",
  "originator_conversation_id": "012e-4077-9e75-...",
  "client_request_id": "20251112164628-13115",
  "result_code": "0",
  "result_desc": "The service request is processed successfully.",
  "transaction_receipt": "TJ4IM6IK6X",
  "transaction_id": "TJ4IM6IK6X",
  "amount": 4500,
  "msisdn": "254729399821",
  "customer_name": "RONOH GILBERT CHERUIYOT",
  "customer_id": "0729399821",
  "status": "success",
  "processed_at": "2025-11-14T11:30:00.000Z",
  "has_callback": true,
  "callback_received_at": "2025-11-12T14:50:05.559Z"
}
```

## Important Notes

### Query Process
1. **Asynchronous**: Queries are asynchronous. The API response only confirms the query was accepted.
2. **Callback Required**: Results arrive via callback URL (`/api/mpesa-callback/transaction-status-result`)
3. **Wait Time**: Callbacks typically arrive within 1-5 minutes
4. **Check Back**: Refresh the page after a few minutes to see updated status

### Webhook Configuration
- Webhook URL is configured via `USSD_WEBHOOK_URL` environment variable
- Must be publicly accessible
- Should return 200 OK
- Webhook includes all transaction details and callback data

### Credentials
- Uses partner vault credentials automatically
- No need to manually enter M-Pesa credentials
- Credentials are decrypted from vault securely

## Troubleshooting

### No Transactions Shown
- All transactions might have callbacks
- Try adjusting filters
- Check if transactions exist in database

### Query Fails
- Check if partner has M-Pesa credentials in vault
- Verify credentials are correct
- Check server logs for detailed error messages

### Webhook Fails
- Verify `USSD_WEBHOOK_URL` is configured
- Check if webhook URL is publicly accessible
- Verify webhook endpoint returns 200 OK
- Check server logs for delivery errors

### CSV Upload Fails
- Ensure CSV has a column with originator_conversation_ids
- Check CSV format (should be valid CSV)
- Verify column names match supported formats

## Security

- ✅ Only super_admin can access this page
- ✅ Uses JWT authentication
- ✅ Credentials are stored encrypted in vault
- ✅ Webhook URL is configurable via environment variable

## Next Steps

1. **Deploy the code**
2. **Test the page** by accessing `/management/missing-callbacks`
3. **Upload a CSV** with your originator_conversation_ids
4. **Query transactions** to get status from Safaricom
5. **Send webhooks** to USSD team with results

## Related Files

- `app/management/missing-callbacks/page.tsx` - Main UI page
- `app/api/admin/missing-callbacks/route.ts` - Get transactions without callbacks
- `app/api/admin/missing-callbacks/send-webhook/route.ts` - Send webhook to USSD
- `app/api/mpesa/query-transaction-status/route.ts` - Query Safaricom API
- `components/Sidebar.tsx` - Navigation menu
- `components/AppLayout.tsx` - Page title and description

