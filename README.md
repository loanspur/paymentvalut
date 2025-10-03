# Payments Vault

A secure payments processing system built with Supabase Edge Functions, Next.js, and USSD integration supporting multiple partner organizations with M-Pesa B2C disbursement capabilities.

## 🏢 Supported Partners

- **Kulman Group Limited** (Short Code: 174379)
- **Finsafe Limited** (Short Code: 174380) 
- **ABC Limited** (Short Code: 174381)

## 🚀 Features

- **Secure Credential Storage**: M-Pesa credentials stored in Supabase Vault
- **Edge Functions**: Serverless functions for disbursement processing
- **USSD Integration**: Webhook-based notifications to USSD backends
- **Admin Interface**: Simple Next.js UI for testing and monitoring
- **Audit Trail**: Complete transaction logging and reconciliation
- **Idempotency**: Prevents duplicate disbursements

## 🏗️ Architecture

```
USSD Backend → Supabase Edge Function → M-Pesa B2C API
     ↑                    ↓
Webhook Notification ← Callback Handler
```

## 📋 Prerequisites

- Node.js 18+
- Supabase account
- M-Pesa B2C credentials
- Kenyan phone number for testing

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd mpesaB2C
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the migrations:
   ```sql
   -- Run supabase/migrations/001_initial_schema.sql
   -- Run supabase/migrations/002_seed_kulmnagroup.sql
   ```

3. Deploy Edge Functions:
   ```bash
   supabase functions deploy disburse
   supabase functions deploy mpesa/b2c/result
   supabase functions deploy mpesa/b2c/timeout
   supabase functions deploy partners-create
   ```

### 3. Environment Configuration

Copy `env.example` to `.env.local` and configure:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# M-Pesa B2C Credentials for Kulmnagroup Limited
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENVIRONMENT=sandbox

# USSD Integration
USSD_WEBHOOK_URL=https://your-ussd-backend.com/webhook/mpesa-callback
```

### 4. M-Pesa Credentials Setup

For Kulmnagroup Limited, configure these in Supabase Edge Function secrets:

1. Go to Supabase Dashboard → Edge Functions → Settings
2. Add these secrets:
   - `MPESA_CONSUMER_KEY`: Your M-Pesa consumer key
   - `MPESA_CONSUMER_SECRET`: Your M-Pesa consumer secret
   - `MPESA_SHORTCODE`: 174379 (sandbox) or your live shortcode
   - `MPESA_PASSKEY`: Your M-Pesa passkey
   - `MPESA_ENVIRONMENT`: sandbox or production

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to access the admin interface.

## 🔑 API Usage

### Disbursement Request

**Kulman Group Limited:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: [YOUR_API_KEY]" \
  -d '{
    "amount": 1200,
    "msisdn": "2547XXXXXXXX",
    "tenant_id": "KULMNA_TENANT",
    "customer_id": "CUST456",
    "client_request_id": "KULMNA-2025-01-09-000123"
  }'
```

**Finsafe Limited:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: [YOUR_API_KEY]" \
  -d '{
    "amount": 1500,
    "msisdn": "2547XXXXXXXX",
    "tenant_id": "FINSEF_TENANT",
    "customer_id": "CUST456",
    "client_request_id": "FINSEF-2025-01-09-000123"
  }'
```

**ABC Limited:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: [YOUR_API_KEY]" \
  -d '{
    "amount": 2000,
    "msisdn": "2547XXXXXXXX",
    "tenant_id": "ABC_TENANT",
    "customer_id": "CUST456",
    "client_request_id": "ABC-2025-01-09-000123"
  }'
```

### Response

```json
{
  "status": "accepted",
  "disbursement_id": "uuid",
  "conversation_id": "AG_2025...123",
  "will_callback": true
}
```

## 📊 Database Schema

### Partners Table
- `id`: UUID primary key
- `name`: Partner name
- `api_key_hash`: SHA-256 hashed API key
- `is_active`: Boolean status
- `last_used_at`: Timestamp

### Disbursement Requests Table
- `id`: UUID primary key
- `origin`: 'ui' or 'ussd'
- `tenant_id`: Tenant identifier
- `customer_id`: Customer identifier
- `client_request_id`: Idempotency key
- `msisdn`: Phone number
- `amount`: Disbursement amount
- `status`: queued, accepted, failed, success
- `conversation_id`: M-Pesa conversation ID
- `transaction_receipt`: M-Pesa transaction receipt
- `result_code`: M-Pesa result code
- `result_desc`: M-Pesa result description

## 🔒 Security Features

- **API Key Authentication**: SHA-256 hashed partner keys
- **Idempotency**: Prevents duplicate disbursements
- **Secure Storage**: Credentials in Supabase Vault
- **HTTPS Only**: All communications encrypted
- **Audit Trail**: Complete transaction logging

## 🧪 Testing

### Test Disbursement

1. Open the admin interface
2. Click "New Disbursement"
3. Fill in the form:
   - Amount: 100 (KES)
   - Phone: 2547XXXXXXXX (your test number)
   - Customer ID: TEST001
4. Click "Send Disbursement"

### Monitor Status

- Check the disbursements table for real-time updates
- Status changes: queued → accepted → success/failed
- Transaction receipts appear on successful disbursements

## 📱 USSD Integration

The system sends webhooks to your USSD backend when disbursements complete:

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

## 🚨 Error Handling

- **Invalid API Key**: 401 Unauthorized
- **Invalid MSISDN**: 400 Bad Request
- **Duplicate Request**: Returns existing disbursement
- **M-Pesa Errors**: Proper error codes and messages
- **Webhook Failures**: Logged but don't fail disbursement

## 📈 Monitoring

- Real-time dashboard with statistics
- Transaction history and status tracking
- Error logging and debugging
- Partner usage analytics

## 🔧 Troubleshooting

### Common Issues

1. **M-Pesa API Errors**: Check credentials and environment
2. **Webhook Failures**: Verify USSD backend URL
3. **Database Errors**: Check Supabase connection
4. **CORS Issues**: Verify Edge Function CORS headers

### Debug Mode

Enable debug logging by setting `DEBUG=true` in environment variables.

## 📞 Support

For technical support or questions:
- Email: support@kulmnagroup.com
- Documentation: [Link to detailed docs]
- Issues: [GitHub Issues]

## 📄 License

This project is proprietary to Kulmnagroup Limited. All rights reserved.

---

**Built with ❤️ for Kulmnagroup Limited**
