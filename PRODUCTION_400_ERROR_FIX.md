# Production 400 Error Fix - SMS Balance

## 🔍 Issue: 400 Bad Request from `/api/sms/balance`

The API is returning **400 (Bad Request)** status code, which means SMS credentials are not configured.

## ✅ Root Cause

**Environment variables are missing in Digital Ocean App Platform.**

Based on the code, a 400 status is returned when:
- `SUPER_ADMIN_SMS_ENABLED` is not `'true'` OR
- `SUPER_ADMIN_SMS_USERNAME` is missing OR
- `SUPER_ADMIN_SMS_API_KEY` is missing

## 🔧 Fix Steps

### Step 1: Add Environment Variables in Digital Ocean

1. **Go to Digital Ocean App Platform Dashboard**
   - Visit: https://cloud.digitalocean.com/apps
   - Select your `eazzypay` app

2. **Navigate to Environment Variables**
   - Go to: **Settings** → **App-Level Environment Variables**
   - Or: **Components** → **Web Service** → **Settings** → **Environment Variables**

3. **Add These Required Variables:**
   ```bash
   SUPER_ADMIN_SMS_ENABLED=true
   SUPER_ADMIN_SMS_USERNAME=your_airtouch_username
   SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key
   SUPER_ADMIN_SMS_SENDER_ID=eazzypay  # Optional, defaults to 'eazzypay'
   ```

4. **Verify Variable Names (Case-Sensitive):**
   - ✅ `SUPER_ADMIN_SMS_ENABLED` (exact)
   - ✅ `SUPER_ADMIN_SMS_USERNAME` (exact)
   - ✅ `SUPER_ADMIN_SMS_API_KEY` (exact)
   - ❌ NOT `SUPER_ADMIN_SMS_ENABLED` (different case)
   - ❌ NOT `SUPER_ADMIN_ENABLED` (missing SMS)

### Step 2: Redeploy (CRITICAL!)

**Environment variables require a redeploy to take effect.**

**Option A: Auto-Deploy via GitHub**
```bash
git add .
git commit -m "Add SMS balance logging"
git push origin main
```

**Option B: Manual Redeploy**
1. Go to Digital Ocean App Platform Dashboard
2. Your App → **Deployments**
3. Click **"Create Deployment"** or **"Redeploy"**

### Step 3: Verify Variables Are Loaded

After redeploy, test in browser console:

```javascript
fetch('/api/sms/balance', {
  credentials: 'include'
})
.then(r => {
  console.log('Status:', r.status)
  return r.json()
})
.then(data => {
  console.log('Response:', data)
  if (data.debug) {
    console.log('Debug Info:', data.debug)
    console.log('Has Username:', data.debug.has_env_username)
    console.log('Has API Key:', data.debug.has_env_apikey)
  }
})
```

**Expected Results:**
- ✅ If variables are set: Status 200, `success: true`, balance displayed
- ❌ If variables are missing: Status 400, `success: false`, debug info shows what's missing

## 📋 Debug Information

After deploying the enhanced logging, you'll see detailed error messages in the browser console:

```javascript
❌ SMS Balance API Error: {
  status: 400,
  statusText: "Bad Request",
  error: "SMS credentials not configured...",
  debug: {
    user_role: "super_admin",
    super_admin_sms_enabled: undefined,  // Should be "true"
    has_env_username: false,            // Should be true
    has_env_apikey: false,               // Should be true
    env_username_length: 0,              // Should be > 0
    env_apikey_length: 0                 // Should be > 0
  }
}
```

## 🔍 What Each Debug Field Means

### `super_admin_sms_enabled`
- **Expected:** `"true"` (string, not boolean)
- **If undefined:** `SUPER_ADMIN_SMS_ENABLED` variable not set
- **Fix:** Add `SUPER_ADMIN_SMS_ENABLED=true` in Digital Ocean

### `has_env_username`
- **Expected:** `true`
- **If false:** `SUPER_ADMIN_SMS_USERNAME` not set or empty
- **Fix:** Add `SUPER_ADMIN_SMS_USERNAME=your_username` in Digital Ocean

### `has_env_apikey`
- **Expected:** `true`
- **If false:** `SUPER_ADMIN_SMS_API_KEY` not set or empty
- **Fix:** Add `SUPER_ADMIN_SMS_API_KEY=your_api_key` in Digital Ocean

### `env_username_length` / `env_apikey_length`
- **Expected:** > 0 (length of the actual value)
- **If 0:** Variable is empty string or not set
- **Fix:** Ensure variables have actual values, not empty strings

## ⚠️ Common Mistakes

### Mistake 1: Variable Not Redeployed
- **Symptom:** Variables added but still getting 400
- **Fix:** Must redeploy after adding variables

### Mistake 2: Wrong Variable Scope
- **Symptom:** Variables added but not accessible
- **Fix:** Use "App-Level" variables, not "Component-Level"

### Mistake 3: Typos in Variable Names
- **Symptom:** `super_admin_sms_enabled: undefined`
- **Fix:** Check exact spelling: `SUPER_ADMIN_SMS_ENABLED` (all caps, underscores)

### Mistake 4: Boolean Instead of String
- **Symptom:** Variable exists but not recognized
- **Fix:** Must be string `"true"`, not boolean `true`

### Mistake 5: Empty Values
- **Symptom:** `has_env_username: false` even though variable exists
- **Fix:** Ensure values are not empty strings

## 🧪 Testing After Fix

1. **Add environment variables** in Digital Ocean
2. **Redeploy** the application
3. **Refresh** eazzypay.online
4. **Open browser console** (F12)
5. **Check for errors:**
   - ✅ No errors = SMS balance should display
   - ❌ Still 400 = Check debug info for what's missing
6. **Look for SMS balance** in top bar (should show "SMS: KES X.XX")

## 📝 Quick Checklist

- [ ] Go to Digital Ocean App Platform Dashboard
- [ ] Navigate to Settings → Environment Variables
- [ ] Add `SUPER_ADMIN_SMS_ENABLED=true`
- [ ] Add `SUPER_ADMIN_SMS_USERNAME=your_username`
- [ ] Add `SUPER_ADMIN_SMS_API_KEY=your_api_key`
- [ ] Verify variable names are exact (case-sensitive)
- [ ] Verify values are not empty
- [ ] **Redeploy the application** (critical!)
- [ ] Refresh eazzypay.online
- [ ] Check browser console for errors
- [ ] Verify SMS balance displays

## 🎯 Expected Outcome

After fixing:
- ✅ No more 400 errors
- ✅ SMS balance displays in top bar
- ✅ Console shows no SMS balance errors
- ✅ API returns `success: true` with balance value

## 📞 If Still Not Working

1. **Check App Platform Runtime Logs:**
   - Go to Digital Ocean Dashboard
   - Your App → **Runtime Logs**
   - Look for "SMS credentials not configured" errors
   - Check for AirTouch API connection errors

2. **Verify Credentials Are Correct:**
   - Test AirTouch API directly with your credentials
   - Ensure username and API key are correct
   - Check if AirTouch has IP restrictions

3. **Check Network Tab:**
   - Open browser DevTools → Network tab
   - Filter for `/api/sms/balance`
   - Click on the request
   - Check Response tab for full error message
   - Check Headers for authentication

The enhanced logging will now show you exactly what's missing!

