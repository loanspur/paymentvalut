# 🏢 Kulman Group Limited - M-Pesa B2C Setup

## 🔑 Pre-configured Credentials

### Partner Information
- **Company**: Kulman Group Limited
- **Partner ID**: `550e8400-e29b-41d4-a716-446655440000`
- **API Key**: `kulmna_sk_live_1234567890abcdef`
- **Status**: Active
- **Created**: 2025-01-09

### API Key Details
```
API Key: kulmna_sk_live_1234567890abcdef
Hash: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
Usage: Include in x-api-key header for all disbursement requests
```

## 🧪 Test Credentials

### M-Pesa Sandbox (for testing)
```
Consumer Key: [YOUR_MPESA_CONSUMER_KEY]
Consumer Secret: [YOUR_MPESA_CONSUMER_SECRET]
Shortcode: 174379
Passkey: [YOUR_MPESA_PASSKEY]
Environment: sandbox
```

### Test Phone Numbers
```
Primary Test: 254712345678
Secondary Test: 254798765432
Format: 254 + 9 digits (Kenyan format)
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `env.example` to `.env.local` and update:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test Disbursement
```bash
node test-disbursement.js
```

## 📱 API Usage Examples

### Disbursement Request
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: kulmna_sk_live_1234567890abcdef" \
  -d '{
    "amount": 1200,
    "msisdn": "254712345678",
    "tenant_id": "TEN123",
    "customer_id": "CUST456",
    "client_request_id": "USSD-2025-01-09-000123"
  }'
```

### Expected Response
```json
{
  "status": "accepted",
  "disbursement_id": "uuid",
  "conversation_id": "AG_2025...123",
  "will_callback": true
}
```

## 🔄 Webhook Integration

### Webhook URL
```
POST https://your-ussd-backend.com/webhook/mpesa-callback
```

### Webhook Payload
```json
{
  "disbursement_id": "uuid",
  "conversation_id": "AG_2025...123",
  "result_code": 0,
  "result_desc": "The service request is processed successfully.",
  "transaction_receipt": "LGXXXXXXX",
  "amount": 1200,
  "msisdn": "254712345678",
  "processed_at": "2025-01-10T12:34:56Z"
}
```

## 📊 Admin Interface

### Access
- **URL**: `http://localhost:3000` (development)
- **Features**:
  - Create disbursements
  - View transaction history
  - Monitor status updates
  - Real-time statistics

### Dashboard Features
- Total disbursements count
- Success/failure statistics
- Pending transactions
- Transaction details table
- Real-time status updates

## 🛡️ Security Features

### Authentication
- API key-based authentication
- SHA-256 hashed keys
- Partner-specific access control

### Data Protection
- All credentials stored in Supabase Vault
- HTTPS-only communication
- Audit trail for all transactions
- Idempotency protection

## 📈 Monitoring

### Real-time Metrics
- Transaction success rate
- Average processing time
- Error rate tracking
- Partner usage statistics

### Logs
- All API requests logged
- M-Pesa callback tracking
- Error logging and debugging
- Webhook delivery status

## 🔧 Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Verify: `x-api-key: kulmna_sk_live_1234567890abcdef`
   - Check: Partner is active in database

2. **M-Pesa API Errors**
   - Verify: Consumer key and secret
   - Check: Phone number format (254XXXXXXXX)
   - Ensure: Sandbox environment for testing

3. **Webhook Failures**
   - Verify: USSD backend URL is accessible
   - Check: Webhook endpoint accepts POST requests
   - Review: Webhook logs for errors

### Debug Commands
```bash
# Test API connectivity
node test-disbursement.js

# Check Supabase connection
npm run dev

# View Edge Function logs
supabase functions logs disburse
```

## 📞 Support Contacts

### Technical Support
- **Email**: support@kulmnagroup.com
- **Phone**: +254 XXX XXX XXX
- **Hours**: 8 AM - 6 PM EAT (Monday - Friday)

### Emergency Support
- **Phone**: +254 XXX XXX XXX
- **Email**: emergency@kulmnagroup.com
- **Available**: 24/7

## 📋 Next Steps

1. **Deploy to Production**
   - Follow `DEPLOYMENT.md` guide
   - Configure production M-Pesa credentials
   - Set up monitoring and alerts

2. **USSD Integration**
   - Configure webhook URL in your USSD backend
   - Test webhook delivery
   - Implement SMS and loan creation logic

3. **Go Live**
   - Switch to production M-Pesa environment
   - Update API keys for production
   - Monitor system performance

---

**🎉 Your M-Pesa B2C Disbursement System is ready for Kulmnagroup Limited!**

**System Status**: ✅ Ready for Testing  
**Last Updated**: 2025-01-09  
**Version**: 1.0.0
