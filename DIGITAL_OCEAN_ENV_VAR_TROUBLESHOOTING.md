# Digital Ocean Environment Variables Troubleshooting

## 🔍 Issue: SMS Balance Returns 400 Error

**Error:** `GET https://eazzypay.online/api/sms/balance 400 (Bad Request)`

**Error Message:** "SMS credentials not configured. Please check environment variables or database settings."

**Debug Info Shows:**
- `has_env_username: false`
- `has_env_apikey: false`
- `env_username_length: 0`
- `env_apikey_length: 0`

This means **Digital Ocean is NOT reading the environment variables** you added.

## ✅ Fix: Verify Environment Variables in Digital Ocean

### Step 1: Check Environment Variables Exist

1. **Go to Digital Ocean App Platform:**
   - https://cloud.digitalocean.com/apps
   - Click on your `eazzypay` app

2. **Navigate to Settings > App-Level Environment Variables:**
   - Click **"Settings"** tab
   - Scroll to **"App-Level Environment Variables"** section

3. **Verify these variables exist (EXACT names, case-sensitive):**
   ```
   SUPER_ADMIN_SMS_ENABLED
   SUPER_ADMIN_SMS_USERNAME
   SUPER_ADMIN_SMS_API_KEY
   SUPER_ADMIN_SMS_SENDER_ID  (optional)
   ```

### Step 2: Check Variable Names (Common Issues)

❌ **WRONG (will NOT work):**
- `SUPER_ADMIN_SMS_ENABLED=true` (includes value in name)
- `super_admin_sms_enabled` (lowercase)
- `SUPER_ADMIN_SMS_USERNAME ` (trailing space)
- `SUPER_ADMIN_SMS_USERNAME=` (equals sign)

✅ **CORRECT:**
- **Variable Name:** `SUPER_ADMIN_SMS_ENABLED`
- **Variable Value:** `true`

- **Variable Name:** `SUPER_ADMIN_SMS_USERNAME`
- **Variable Value:** `your_actual_username`

- **Variable Name:** `SUPER_ADMIN_SMS_API_KEY`
- **Variable Value:** `your_actual_api_key`

### Step 3: Check Variable Values

Make sure values are:
- ✅ Not empty
- ✅ No extra spaces (trim whitespace)
- ✅ No quotes (don't wrap values in `"` or `'`)
- ✅ Actual credentials (not placeholders like `your_username`)

**Example:**
```
Variable Name: SUPER_ADMIN_SMS_ENABLED
Variable Value: true

Variable Name: SUPER_ADMIN_SMS_USERNAME
Variable Value: myactualuser

Variable Name: SUPER_ADMIN_SMS_API_KEY
Variable Value: abc123xyz789
```

### Step 4: Redeploy After Adding Variables

**⚠️ CRITICAL:** After adding/changing environment variables:

1. **Digital Ocean App Platform:**
   - Go to your app
   - Click **"Actions"** dropdown
   - Click **"Force Rebuild"** or **"Deploy"**
   - Wait for deployment to complete (5-10 minutes)

2. **Why redeploy is needed:**
   - Environment variables are read at **build time** for Next.js
   - Changing variables requires a **new build**
   - Old build still has old (or no) variables

### Step 5: Verify Deployment

1. **Check deployment logs:**
   - Go to **"Runtime Logs"** tab
   - Look for build errors
   - Check for any environment variable warnings

2. **Test after redeploy:**
   - Open https://eazzypay.online
   - Login as super_admin
   - Check console (should see SMS balance or cleaner error)

## 🔧 Alternative: Use Database SMS Settings

If environment variables aren't working, you can use database settings:

1. **Go to Supabase Dashboard:**
   - Find `partner_sms_settings` table
   - Find a record with `sms_enabled = true`

2. **Make sure it has:**
   - `damza_username` (your AirTouch username)
   - `damza_api_key` (your AirTouch API key - encrypted)
   - `sms_enabled = true`
   - `is_encrypted = true` (if credentials are encrypted)

3. **The API will fallback to database** if environment variables are missing.

## 📋 Quick Checklist

- [ ] Environment variables added in Digital Ocean App Platform
- [ ] Variable names are EXACT (case-sensitive, no spaces)
- [ ] Variable values are actual credentials (not placeholders)
- [ ] No quotes around values
- [ ] App redeployed after adding variables
- [ ] Deployment completed successfully
- [ ] Tested on https://eazzypay.online after redeploy

## 🧪 Testing

After fixing, test by:

1. **Open browser console on eazzypay.online:**
   ```javascript
   fetch('/api/sms/balance', { credentials: 'include' })
     .then(r => r.json())
     .then(data => {
       console.log('Success:', data.success)
       console.log('Balance:', data.balance)
       if (data.debug) {
         console.log('Debug:', data.debug)
       }
     })
   ```

2. **Expected Results:**
   - ✅ `success: true`
   - ✅ `balance: <number>`
   - ❌ If still 400, check `data.debug` for what's missing

## 🔍 Debugging Tips

### Check What Digital Ocean Sees

You can't directly see environment variables in Digital Ocean (for security), but you can:

1. **Add a test API endpoint** to verify:
   ```typescript
   // app/api/test-env/route.ts
   export async function GET() {
     return NextResponse.json({
       has_enabled: !!process.env.SUPER_ADMIN_SMS_ENABLED,
       enabled_value: process.env.SUPER_ADMIN_SMS_ENABLED,
       has_username: !!process.env.SUPER_ADMIN_SMS_USERNAME,
       username_length: process.env.SUPER_ADMIN_SMS_USERNAME?.length || 0,
       has_apikey: !!process.env.SUPER_ADMIN_SMS_API_KEY,
       apikey_length: process.env.SUPER_ADMIN_SMS_API_KEY?.length || 0,
     })
   }
   ```

2. **Then call:** `https://eazzypay.online/api/test-env`

### Common Mistakes

1. **Variable added but app not redeployed** → Redeploy!
2. **Variable name has typo** → Check exact spelling
3. **Variable value is empty** → Add actual value
4. **Variable value has quotes** → Remove quotes
5. **Variable added to wrong app** → Check you're editing correct app
6. **Variable added to component-level** instead of app-level → Use app-level

## 📝 Notes

- Environment variables are **case-sensitive**
- Digital Ocean requires **redeploy** after adding variables
- Next.js reads env vars at **build time**, not runtime
- Old deployments keep old variables until redeploy
- Production and staging environments have separate variables

## 🆘 Still Not Working?

If after all checks it still doesn't work:

1. **Verify AirTouch credentials are correct:**
   - Test credentials directly with AirTouch API
   - Make sure account is active and has balance

2. **Check Digital Ocean build logs:**
   - Look for any warnings about environment variables
   - Check for build errors

3. **Use database fallback:**
   - Configure SMS settings in `partner_sms_settings` table
   - API will use database if env vars aren't found

4. **Contact Digital Ocean Support:**
   - They can verify if variables are actually set
   - They can check if there are any platform issues

