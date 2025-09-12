# 🏢 Partner Organizations Configuration

## 📋 Overview

The M-Pesa B2C Disbursement System supports **3 different partner organizations**, each with their own M-Pesa B2C credentials and API keys.

---

## 🏢 Partner 1: Kulman Group Limited

### Company Information
- **Company Name**: Kulman Group Limited
- **Partner ID**: `550e8400-e29b-41d4-a716-446655440000`
- **Status**: Active
- **M-Pesa Configuration**: ✅ Configured

### API Credentials
```
API Key: kulmna_sk_live_1234567890abcdef
API Key Hash: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### M-Pesa B2C Configuration
```
Short Code: 174379
Consumer Key: [YOUR_KULMNA_MPESA_CONSUMER_KEY]
Consumer Secret: [YOUR_KULMNA_MPESA_CONSUMER_SECRET]
Passkey: [YOUR_KULMNA_MPESA_PASSKEY]
Environment: sandbox
```

### Test Usage
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: kulmna_sk_live_1234567890abcdef" \
  -d '{
    "amount": 1200,
    "msisdn": "254712345678",
    "tenant_id": "KULMNA_TENANT",
    "customer_id": "KULMNA_CUST001",
    "client_request_id": "KULMNA-2025-01-09-001"
  }'
```

---

## 🏢 Partner 2: Finsafe Limited

### Company Information
- **Company Name**: Finsafe Limited
- **Partner ID**: `660e8400-e29b-41d4-a716-446655440001`
- **Status**: Active
- **M-Pesa Configuration**: ✅ Configured

### API Credentials
```
API Key: finsef_sk_live_1234567890abcdef
API Key Hash: b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890
```

### M-Pesa B2C Configuration
```
Short Code: 174380
Consumer Key: [YOUR_FINSEF_MPESA_CONSUMER_KEY]
Consumer Secret: [YOUR_FINSEF_MPESA_CONSUMER_SECRET]
Passkey: [YOUR_FINSEF_MPESA_PASSKEY]
Environment: sandbox
```

### Test Usage
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: finsef_sk_live_1234567890abcdef" \
  -d '{
    "amount": 1500,
    "msisdn": "254798765432",
    "tenant_id": "FINSEF_TENANT",
    "customer_id": "FINSEF_CUST001",
    "client_request_id": "FINSEF-2025-01-09-001"
  }'
```

---

## 🏢 Partner 3: ABC Limited

### Company Information
- **Company Name**: ABC Limited
- **Partner ID**: `770e8400-e29b-41d4-a716-446655440002`
- **Status**: Active
- **M-Pesa Configuration**: ✅ Configured

### API Credentials
```
API Key: abc_sk_live_1234567890abcdef
API Key Hash: c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcd
```

### M-Pesa B2C Configuration
```
Short Code: 174381
Consumer Key: [YOUR_ABC_MPESA_CONSUMER_KEY]
Consumer Secret: [YOUR_ABC_MPESA_CONSUMER_SECRET]
Passkey: [YOUR_ABC_MPESA_PASSKEY]
Environment: sandbox
```

### Test Usage
```bash
curl -X POST https://your-project.supabase.co/functions/v1/disburse \
  -H "Content-Type: application/json" \
  -H "x-api-key: abc_sk_live_1234567890abcdef" \
  -d '{
    "amount": 2000,
    "msisdn": "254711122233",
    "tenant_id": "ABC_TENANT",
    "customer_id": "ABC_CUST001",
    "client_request_id": "ABC-2025-01-09-001"
  }'
```

---

## 🔧 Configuration Steps

### 1. Database Setup
Run the migration to add all three partners:
```sql
-- Run supabase/migrations/003_multiple_shortcodes.sql
```

### 2. M-Pesa Credentials Setup
For each partner, update their M-Pesa credentials in the database:

```sql
-- Update Kulman Group Limited
UPDATE partners 
SET 
    mpesa_consumer_key = 'YOUR_ACTUAL_KULMNA_CONSUMER_KEY',
    mpesa_consumer_secret = 'YOUR_ACTUAL_KULMNA_CONSUMER_SECRET',
    mpesa_passkey = 'YOUR_ACTUAL_KULMNA_PASSKEY'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Update Finsafe Limited
UPDATE partners 
SET 
    mpesa_consumer_key = 'YOUR_ACTUAL_FINSEF_CONSUMER_KEY',
    mpesa_consumer_secret = 'YOUR_ACTUAL_FINSEF_CONSUMER_SECRET',
    mpesa_passkey = 'YOUR_ACTUAL_FINSEF_PASSKEY'
WHERE id = '660e8400-e29b-41d4-a716-446655440001';

-- Update ABC Limited
UPDATE partners 
SET 
    mpesa_consumer_key = 'YOUR_ACTUAL_ABC_CONSUMER_KEY',
    mpesa_consumer_secret = 'YOUR_ACTUAL_ABC_CONSUMER_SECRET',
    mpesa_passkey = 'YOUR_ACTUAL_ABC_PASSKEY'
WHERE id = '770e8400-e29b-41d4-a716-446655440002';
```

### 3. Admin Interface
The admin interface now includes:
- Partner selection dropdown in disbursement form
- Partner information in transaction table
- Separate statistics per partner
- Real-time monitoring for all partners

---

## 🧪 Testing

### Test All Partners
1. **Kulmnagroup Limited**: Use API key `kulmna_sk_live_1234567890abcdef`
2. **Finsef Limited**: Use API key `finsef_sk_live_1234567890abcdef`
3. **ABC Limited**: Use API key `abc_sk_live_1234567890abcdef`

### Admin Interface Testing
1. Open the admin interface
2. Click "New Disbursement"
3. Select a partner from the dropdown
4. Fill in the disbursement details
5. Submit and monitor the transaction

---

## 📊 Monitoring

### Per-Partner Statistics
- Total disbursements per partner
- Success/failure rates per partner
- Transaction volume per partner
- Real-time status updates

### Partner-Specific Logs
- All transactions are tagged with partner information
- Separate webhook URLs can be configured per partner
- Individual partner API key usage tracking

---

## 🔒 Security

### API Key Management
- Each partner has a unique API key
- API keys are SHA-256 hashed in the database
- Partner-specific access control
- Audit trail for all partner activities

### M-Pesa Credentials
- Each partner's M-Pesa credentials are stored separately
- Credentials are encrypted in the database
- Partner-specific M-Pesa API calls
- No credential sharing between partners

---

## 📞 Support

### Partner-Specific Support
- **Kulman Group Limited**: support@kulmangroup.com
- **Finsafe Limited**: support@finsafe.com
- **ABC Limited**: support@abclimited.com

### Technical Support
- **System Admin**: admin@mpesa-disbursement.com
- **Documentation**: This repository
- **Issues**: GitHub Issues

---

**🎉 All three partner organizations are now configured and ready for testing!**
