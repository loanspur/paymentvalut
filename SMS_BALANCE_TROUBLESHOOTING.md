# SMS Balance Display Troubleshooting

## Issue: SMS Balance Not Displaying After Digital Ocean Migration

After migrating from Vercel to Digital Ocean App Platform, the SMS balance may not display due to missing environment variables.

## 🔍 Quick Diagnosis

### Step 1: Check Browser Console

Open browser console (F12) and look for errors when loading the page:

```javascript
// Look for these errors:
"SMS Balance API Error: ..."
"SMS Balance fetch error: ..."
```

### Step 2: Test API Endpoint Directly

In browser console on your Digital Ocean app:

```javascript
fetch('/api/sms/balance', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('SMS Balance Response:', data)
  if (!data.success) {
    console.error('Error:', data.error)
    console.error('Debug Info:', data.debug)
  }
})
```

## 🛠️ Common Issues & Fixes

### Issue 1: Missing Environment Variables

**Symptom:** Error: "SMS credentials not configured"

**Fix:**

1. **Go to Digital Ocean App Platform Dashboard**
   - Your App → Settings → App-Level Environment Variables

2. **Add these required variables:**
   ```bash
   SUPER_ADMIN_SMS_ENABLED=true
   SUPER_ADMIN_SMS_USERNAME=your_airtouch_username
   SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key
   ```

3. **Or if using database settings:**
   - Ensure `partner_sms_settings` table has entries with `sms_enabled=true`
   - Ensure credentials are properly stored

4. **Redeploy after adding variables:**
   - App Platform may need a redeploy to pick up new environment variables
   - Go to Deployments → Create Deployment or trigger via GitHub push

### Issue 2: Environment Variables Not Loaded

**Symptom:** Variables exist but API returns "not configured"

**Fix:**

1. **Verify variables are set correctly:**
   - Check for typos: `SUPER_ADMIN_SMS_ENABLED` (not `ENABLED_SMS`)
   - Ensure `SUPER_ADMIN_SMS_ENABLED` is exactly `'true'` (string, not boolean)

2. **Check variable scope:**
   - Ensure variables are set at "App-Level" not "Component-Level"
   - Ensure they're available for the web service component

3. **Redeploy:**
   - Environment variables require a redeploy to take effect
   - Push a commit or create a new deployment

### Issue 3: Database Settings Not Accessible

**Symptom:** Falling back to database but still no credentials

**Fix:**

1. **Check database connection:**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is set
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Test database connection works

2. **Check partner_sms_settings table:**
   ```sql
   SELECT damza_username, damza_api_key, sms_enabled, is_encrypted 
   FROM partner_sms_settings 
   WHERE sms_enabled = true;
   ```

3. **Verify credentials exist:**
   - Ensure at least one record has `sms_enabled=true`
   - Ensure `damza_username` and `damza_api_key` are not null

### Issue 4: Encryption Key Mismatch

**Symptom:** Credentials found but decryption fails

**Fix:**

1. **Check encryption passphrase:**
   ```bash
   JWT_SECRET=your_jwt_secret  # Used for decryption
   # OR
   ENCRYPTION_PASSPHRASE=your_encryption_passphrase
   ```

2. **Ensure passphrase matches:**
   - The passphrase used to encrypt must match the one used to decrypt
   - Check what passphrase was used when credentials were encrypted
   - Update `JWT_SECRET` or `ENCRYPTION_PASSPHRASE` in App Platform

### Issue 5: AirTouch API Connection Issues

**Symptom:** Credentials found but API call fails

**Fix:**

1. **Check AirTouch API accessibility:**
   - Digital Ocean App Platform may have different network restrictions
   - Verify outbound HTTPS connections are allowed
   - Test AirTouch API directly from App Platform logs

2. **Check SSL certificate:**
   - AirTouch uses HTTPS with specific certificate
   - App Platform should handle this automatically

## 📋 Environment Variables Checklist

Ensure these are set in Digital Ocean App Platform:

### Required for SMS Balance:

- [ ] `SUPER_ADMIN_SMS_ENABLED=true` (must be string 'true')
- [ ] `SUPER_ADMIN_SMS_USERNAME=your_username`
- [ ] `SUPER_ADMIN_SMS_API_KEY=your_api_key`

### Required for Database Fallback:

- [ ] `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`

### Required for Decryption:

- [ ] `JWT_SECRET=your_jwt_secret` (if credentials are encrypted)
- [ ] `ENCRYPTION_PASSPHRASE=your_passphrase` (alternative)

## 🔧 Step-by-Step Fix

### Option 1: Use Environment Variables (Recommended for Super Admin)

1. **In Digital Ocean App Platform Dashboard:**
   ```
   App → Settings → App-Level Environment Variables
   ```

2. **Add these variables:**
   ```bash
   SUPER_ADMIN_SMS_ENABLED=true
   SUPER_ADMIN_SMS_USERNAME=your_airtouch_username
   SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key
   ```

3. **Redeploy:**
   - Either trigger via GitHub push
   - Or create new deployment in dashboard

4. **Test:**
   ```javascript
   fetch('/api/sms/balance', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log)
   ```

### Option 2: Use Database Settings

1. **Ensure database has SMS settings:**
   ```sql
   -- Check if settings exist
   SELECT * FROM partner_sms_settings WHERE sms_enabled = true;
   
   -- If not, insert (adjust values as needed)
   INSERT INTO partner_sms_settings (
     partner_id, 
     damza_username, 
     damza_api_key, 
     sms_enabled,
     is_encrypted
   ) VALUES (
     'your-partner-id',
     'your_username',
     'your_api_key',
     true,
     false  -- or true if encrypted
   );
   ```

2. **Ensure environment variables for database:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   JWT_SECRET=...  # If credentials are encrypted
   ```

3. **Set SUPER_ADMIN_SMS_ENABLED to false or remove it:**
   - This will force the API to use database settings

## 🧪 Testing After Fix

1. **Test in browser console:**
   ```javascript
   fetch('/api/sms/balance', {
     credentials: 'include'
   })
   .then(r => r.json())
   .then(data => {
     console.log('Success:', data.success)
     console.log('Balance:', data.balance)
     if (!data.success) {
       console.error('Error:', data.error)
     }
   })
   ```

2. **Check App Platform logs:**
   - Go to Runtime Logs tab
   - Look for SMS balance related errors
   - Check for credential retrieval issues

3. **Verify display:**
   - Refresh the page
   - Check top bar for SMS balance
   - Should show "SMS: KES X.XX" or "—" if still loading

## 🚨 Quick Fix Checklist

- [ ] Environment variables added in App Platform
- [ ] Variables have correct names (case-sensitive)
- [ ] `SUPER_ADMIN_SMS_ENABLED` is exactly `'true'` (string)
- [ ] `SUPER_ADMIN_SMS_USERNAME` is not empty
- [ ] `SUPER_ADMIN_SMS_API_KEY` is not empty
- [ ] App redeployed after adding variables
- [ ] Database connection works (if using database fallback)
- [ ] Browser console checked for errors
- [ ] API endpoint tested directly

## 📞 If Still Not Working

1. **Check App Platform logs:**
   - Runtime Logs → Look for SMS balance API errors
   - Check for "SMS credentials not configured" errors
   - Check for AirTouch API connection errors

2. **Verify credentials are correct:**
   - Test AirTouch API directly with your credentials
   - Ensure username and API key are correct

3. **Check network connectivity:**
   - App Platform should have outbound HTTPS access
   - Verify AirTouch API is accessible from App Platform

4. **Contact support:**
   - Digital Ocean App Platform support
   - Check App Platform status page

