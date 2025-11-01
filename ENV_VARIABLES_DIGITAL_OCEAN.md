# Environment Variables for Digital Ocean

Copy these environment variables from Vercel to your Digital Ocean `.env` file.

## Required Environment Variables

### Application Configuration
```bash
NEXT_PUBLIC_APP_URL=https://eazzypay.online
NEXT_PUBLIC_APP_DOMAIN=eazzypay.online
NODE_ENV=production
PORT=3000
```

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://mapgmmiobityxaaevomp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### JWT and Encryption
```bash
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_PASSPHRASE=your_encryption_passphrase_here
```

### M-Pesa (if used)
```bash
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox
```

### SMS (AirTouch)
```bash
SUPER_ADMIN_SMS_ENABLED=true
SUPER_ADMIN_SMS_USERNAME=your_sms_username
SUPER_ADMIN_SMS_API_KEY=your_sms_api_key
SUPER_ADMIN_SMS_PASSWORD=your_sms_password
SUPER_ADMIN_SMS_SENDER_ID=PaymentVault
```

### Email (Resend)
```bash
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@eazzypay.online
```

### Cron Jobs
```bash
CRON_SECRET=your_random_secret_here
```

### NCBA Open Banking
**Note:** These are typically stored in the database (`system_settings` table), but can also be environment variables:

```bash
# Optional - usually in database
NCBA_OB_ENVIRONMENT=uat
NCBA_OB_UAT_BASE_URL=https://openbankingtest.api.ncbagroup.com/test/apigateway/
NCBA_OB_PROD_BASE_URL=https://openbanking.api.ncbagroup.com/apigateway/
NCBA_OB_SUBSCRIPTION_KEY=your_subscription_key
NCBA_OB_USERNAME=NtbUATob254
NCBA_OB_PASSWORD=your_password
NCBA_OB_DEBIT_ACCOUNT_NUMBER=your_account
NCBA_OB_DEBIT_ACCOUNT_CURRENCY=KES
NCBA_OB_COUNTRY=Kenya
NCBA_OB_TOKEN_PATH=/api/v1/Token
NCBA_OB_FLOAT_PURCHASE_PATH=/api/v1/FloatPurchase/floatpurchase
```

## How to Set Environment Variables on Digital Ocean App Platform

### ✅ Method 1: App Platform Dashboard (Recommended)

1. **Go to Digital Ocean App Platform Dashboard**
   - Visit: https://cloud.digitalocean.com/apps
   - Select your app

2. **Navigate to Environment Variables**
   - Go to: Settings → App-Level Environment Variables
   - Or: Components → Web Service → Settings → Environment Variables

3. **Add Variables**
   - Click "Edit" or "Add Variable"
   - Add each variable one by one:
     - Key: `SUPER_ADMIN_SMS_ENABLED`
     - Value: `true`
     - Scope: App-Level (or Component-Level for component-specific)
     - Click "Save"

4. **Important Variables for SMS Balance:**
   ```bash
   SUPER_ADMIN_SMS_ENABLED=true
   SUPER_ADMIN_SMS_USERNAME=your_airtouch_username
   SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key
   ```

5. **Redeploy After Adding Variables**
   - Environment variables require a redeploy to take effect
   - Option 1: Push a commit to GitHub (triggers auto-deploy)
   - Option 2: Go to Deployments → Create Deployment

### ⚠️ Critical: SMS Balance Environment Variables

After migrating from Vercel, ensure these are set in App Platform:

**Required:**
- `SUPER_ADMIN_SMS_ENABLED=true` (must be string 'true', not boolean)
- `SUPER_ADMIN_SMS_USERNAME=your_airtouch_username`
- `SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key`

**Verification:**
- After adding variables, trigger a redeploy
- Test SMS balance API endpoint
- Check App Platform logs for errors

## Verification

After setting environment variables in App Platform:

### Method 1: Test via API Endpoint

In your browser console on the deployed app:

```javascript
// Test SMS balance endpoint
fetch('/api/sms/balance', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('SMS Balance Response:', data)
  if (!data.success) {
    console.error('Error:', data.error)
    console.error('Debug Info:', data.debug) // Shows which variables are missing
  }
})
```

### Method 2: Check App Platform Logs

1. Go to App Platform Dashboard
2. Your App → Runtime Logs
3. Look for SMS balance related errors
4. Check for "SMS credentials not configured" errors

### Method 3: Create Test Endpoint (Temporary)

Create a temporary API endpoint to check environment variables (remove after testing):

```typescript
// app/api/test-env/route.ts (temporary - delete after use)
export async function GET() {
  return Response.json({
    has_sms_enabled: !!process.env.SUPER_ADMIN_SMS_ENABLED,
    sms_enabled_value: process.env.SUPER_ADMIN_SMS_ENABLED,
    has_username: !!process.env.SUPER_ADMIN_SMS_USERNAME,
    has_apikey: !!process.env.SUPER_ADMIN_SMS_API_KEY,
    username_length: process.env.SUPER_ADMIN_SMS_USERNAME?.length || 0,
    apikey_length: process.env.SUPER_ADMIN_SMS_API_KEY?.length || 0
  })
}
```

Then test: `fetch('/api/test-env').then(r => r.json()).then(console.log)`

## Security Notes

1. **Never commit .env to git** - it's already in .gitignore
2. **Backup .env file** securely
3. **Use strong secrets** for JWT_SECRET and ENCRYPTION_PASSPHRASE
4. **Rotate secrets** periodically
5. **Limit file permissions:**
   ```bash
   chmod 600 /var/www/eazzypay/.env
   chown root:root /var/www/eazzypay/.env
   ```

## Migration from Vercel

1. **Export from Vercel:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Copy each variable value to a secure document

2. **Import to Digital Ocean:**
   - Create `.env` file with all variables
   - Restart PM2: `pm2 restart eazzypay --update-env`

3. **Verify:**
   - Check application logs: `pm2 logs eazzypay`
   - Test endpoints: `curl https://eazzypay.online/api/health`

