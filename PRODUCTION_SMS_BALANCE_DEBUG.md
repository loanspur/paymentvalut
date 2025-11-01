# Production SMS Balance Debugging Guide

## Issue: SMS Balance Not Displaying on eazzypay.online

The SMS balance displays correctly on localhost but shows as "SMS —" (dash) on the production site.

## 🔍 Root Cause

**Production error logging was disabled** - Errors were only logged in development mode, making it impossible to debug production issues.

## ✅ Fixes Applied

### 1. **Enabled Production Error Logging**
- ✅ Frontend now logs errors in production (not just development)
- ✅ API now returns debug information in production responses
- ✅ All errors logged to browser console for debugging

### 2. **Enhanced Error Messages**
- ✅ API returns detailed debug info including:
  - User role
  - Environment variable status
  - Credential availability
  - More detailed error messages

## 🧪 How to Debug on Production

### Step 1: Open Browser Console
1. Go to https://eazzypay.online
2. Press **F12** to open Developer Tools
3. Click on **Console** tab
4. Look for errors starting with "SMS Balance"

### Step 2: Check for Errors

You should see one of these errors:

#### Error 1: "SMS credentials not configured"
```javascript
SMS Balance API Error: {
  error: "SMS credentials not configured...",
  debug: {
    user_role: "super_admin",
    super_admin_sms_enabled: "true" or undefined,
    has_env_username: true/false,
    has_env_apikey: true/false,
    env_username_length: 0 or number,
    env_apikey_length: 0 or number
  }
}
```

**Fix:**
- Environment variables not set in Digital Ocean App Platform
- Go to App Platform → Settings → Environment Variables
- Add:
  ```
  SUPER_ADMIN_SMS_ENABLED=true
  SUPER_ADMIN_SMS_USERNAME=your_username
  SUPER_ADMIN_SMS_API_KEY=your_api_key
  ```
- **Redeploy** after adding variables

#### Error 2: "Request timeout"
```javascript
SMS Balance fetch error: {
  name: "AbortError",
  message: "..."
}
```

**Fix:**
- AirTouch API is slow or unreachable from Digital Ocean
- Check Digital Ocean App Platform logs
- Verify AirTouch API is accessible from App Platform IP

#### Error 3: "Failed to fetch SMS balance from AirTouch"
```javascript
SMS Balance API Error: {
  error: "Failed to fetch SMS balance from AirTouch: 401 Unauthorized",
  details: "..."
}
```

**Fix:**
- Invalid AirTouch credentials
- Verify username and API key are correct
- Check if AirTouch API has IP restrictions

### Step 3: Test API Directly

In browser console on production site:

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

This will show you exactly what the API is returning.

## 🔧 Common Issues & Fixes

### Issue 1: Environment Variables Not Set in Digital Ocean

**Symptom:** `has_env_username: false` or `has_env_apikey: false` in debug info

**Fix:**
1. Go to Digital Ocean App Platform Dashboard
2. Your App → Settings → App-Level Environment Variables
3. Add these variables:
   ```bash
   SUPER_ADMIN_SMS_ENABLED=true
   SUPER_ADMIN_SMS_USERNAME=your_airtouch_username
   SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key
   ```
4. **CRITICAL:** Redeploy after adding variables
   - Environment variables require a redeploy to take effect
   - Push a commit or create new deployment

### Issue 2: Environment Variables Set But Not Loaded

**Symptom:** Variables exist but API still says "not configured"

**Possible Causes:**
- Variables added but app not redeployed
- Typo in variable name (must be exact: `SUPER_ADMIN_SMS_ENABLED`)
- Variables set at wrong scope (should be App-Level, not Component-Level)

**Fix:**
1. Verify variable names are exact (case-sensitive)
2. Ensure `SUPER_ADMIN_SMS_ENABLED` is exactly `'true'` (string, not boolean)
3. Redeploy the application
4. Check App Platform Runtime Logs for errors

### Issue 3: AirTouch API Connection Issues

**Symptom:** Timeout or network errors

**Fix:**
1. Check Digital Ocean App Platform logs
2. Verify AirTouch API is accessible from App Platform IP
3. Check for firewall/network restrictions
4. Test AirTouch API directly from server

## 📋 Checklist for Production Debugging

- [ ] Open browser console on production site
- [ ] Check for "SMS Balance" errors
- [ ] Note the error message and debug info
- [ ] Test API endpoint directly (`fetch('/api/sms/balance')`)
- [ ] Check Digital Ocean App Platform Runtime Logs
- [ ] Verify environment variables are set correctly
- [ ] Ensure app was redeployed after adding variables
- [ ] Check AirTouch API accessibility

## 🚀 Quick Fix Steps

1. **Open Browser Console** (F12 on eazzypay.online)
2. **Look for error** starting with "SMS Balance API Error"
3. **Check debug info** in the error object
4. **Verify environment variables** in Digital Ocean:
   - `SUPER_ADMIN_SMS_ENABLED=true`
   - `SUPER_ADMIN_SMS_USERNAME=...`
   - `SUPER_ADMIN_SMS_API_KEY=...`
5. **Redeploy** if variables were just added
6. **Test again** - errors should now be visible in console

## 📝 Expected Behavior

### On Localhost (Working):
- SMS balance displays immediately or after first load
- Console shows no errors (or minimal debug info)

### On Production (After Fix):
- SMS balance should display (may take 1-2 seconds first time)
- If there's an error, console will show detailed error message
- Debug info will indicate what's missing

## 🎯 Next Steps

After deploying the fix:

1. **Refresh eazzypay.online** page
2. **Open browser console** (F12)
3. **Check for errors** - you should now see detailed error messages
4. **Follow the error message** to fix the specific issue
5. **Verify environment variables** are set in Digital Ocean
6. **Redeploy** if needed

The enhanced logging will help identify exactly why SMS balance isn't displaying on production.

