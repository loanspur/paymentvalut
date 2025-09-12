# M-Pesa Credentials Setup Guide

This guide will help you set up real M-Pesa API credentials for testing your Payments Vault System.

## 🔑 Required M-Pesa Credentials

You need the following credentials from Safaricom for each partner:

### 1. **Consumer Key** (`MPESA_CONSUMER_KEY`)
- Your M-Pesa API consumer key
- Format: Usually a long string of characters
- Example: `your_consumer_key_here`

### 2. **Consumer Secret** (`MPESA_CONSUMER_SECRET`)
- Your M-Pesa API consumer secret
- Format: Usually a long string of characters
- Example: `your_consumer_secret_here`

### 3. **Passkey** (`MPESA_PASSKEY`)
- Your M-Pesa API passkey
- Format: Usually a long string of characters
- Example: `your_passkey_here`

### 4. **USSD Webhook URL** (`USSD_WEBHOOK_URL`)
- URL where M-Pesa callbacks will be sent
- Format: Full HTTPS URL
- Example: `https://your-ussd-backend.com/webhook/mpesa`

## 🏢 Partner-Specific Credentials

Since you have multiple partners, you'll need separate credentials for each:

### Kulman Group Limited
- Shortcode: `174379`
- Consumer Key: `[KULMAN_CONSUMER_KEY]`
- Consumer Secret: `[KULMAN_CONSUMER_SECRET]`
- Passkey: `[KULMAN_PASSKEY]`

### Finsafe Limited
- Shortcode: `174380`
- Consumer Key: `[FINSAFE_CONSUMER_KEY]`
- Consumer Secret: `[FINSAFE_CONSUMER_SECRET]`
- Passkey: `[FINSAFE_PASSKEY]`

### ABC Limited
- Shortcode: `174381`
- Consumer Key: `[ABC_CONSUMER_KEY]`
- Consumer Secret: `[ABC_CONSUMER_SECRET]`
- Passkey: `[ABC_PASSKEY]`

## 🚀 Setting Up Secrets

### Option 1: Set Global Secrets (Recommended for Testing)

Set these as global secrets that all Edge Functions can access:

```bash
# Set M-Pesa credentials (replace with your actual values)
npx supabase secrets set MPESA_CONSUMER_KEY="your_actual_consumer_key"
npx supabase secrets set MPESA_CONSUMER_SECRET="your_actual_consumer_secret"
npx supabase secrets set MPESA_PASSKEY="your_actual_passkey"

# Set USSD webhook URL
npx supabase secrets set USSD_WEBHOOK_URL="https://your-ussd-backend.com/webhook/mpesa"
```

### Option 2: Set Partner-Specific Secrets

For production, you might want separate credentials per partner:

```bash
# Kulman Group Limited
npx supabase secrets set KULMAN_CONSUMER_KEY="kulman_consumer_key"
npx supabase secrets set KULMAN_CONSUMER_SECRET="kulman_consumer_secret"
npx supabase secrets set KULMAN_PASSKEY="kulman_passkey"

# Finsafe Limited
npx supabase secrets set FINSAFE_CONSUMER_KEY="finsafe_consumer_key"
npx supabase secrets set FINSAFE_CONSUMER_SECRET="finsafe_consumer_secret"
npx supabase secrets set FINSAFE_PASSKEY="finsafe_passkey"

# ABC Limited
npx supabase secrets set ABC_CONSUMER_KEY="abc_consumer_key"
npx supabase secrets set ABC_CONSUMER_SECRET="abc_consumer_secret"
npx supabase secrets set ABC_PASSKEY="abc_passkey"
```

## 🔍 Verifying Secrets

After setting the secrets, verify they're configured:

```bash
npx supabase secrets list
```

## 🧪 Testing with Real Credentials

Once secrets are set, you can test the endpoints:

```bash
# Test disbursement with real credentials
node test-api-real-auth.js

# Test balance monitoring
node test-balance-monitoring.js
```

## 📋 M-Pesa API Endpoints

### Sandbox Environment (Testing)
- Base URL: `https://sandbox.safaricom.co.ke`
- Use sandbox credentials for testing

### Production Environment
- Base URL: `https://api.safaricom.co.ke`
- Use production credentials for live transactions

## ⚠️ Important Notes

1. **Security**: Never commit real credentials to version control
2. **Environment**: Use sandbox credentials for testing, production for live
3. **Rotation**: M-Pesa credentials may need periodic rotation
4. **Monitoring**: Monitor API usage and limits
5. **Backup**: Keep backup copies of credentials in secure storage

## 🔧 Troubleshooting

### Common Issues:

1. **Invalid Credentials**: Double-check consumer key, secret, and passkey
2. **Network Issues**: Ensure your server can reach M-Pesa APIs
3. **SSL/TLS**: M-Pesa requires HTTPS connections
4. **Rate Limits**: M-Pesa has API rate limits
5. **IP Whitelisting**: Your server IP may need to be whitelisted

### Error Codes:
- `AUTH_1001`: Invalid consumer key/secret
- `AUTH_1002`: Invalid passkey
- `NET_1001`: Network connectivity issues
- `API_1001`: M-Pesa API errors

## 📞 Support

If you need help:
1. Check M-Pesa API documentation
2. Contact Safaricom developer support
3. Review your Edge Function logs
4. Test with sandbox credentials first

---

**Next Steps:**
1. Get your M-Pesa credentials from Safaricom
2. Set the secrets using the commands above
3. Test the endpoints with real credentials
4. Deploy to production when ready
