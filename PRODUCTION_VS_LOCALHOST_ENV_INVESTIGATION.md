# Production vs Localhost Environment Variables Investigation

## 🔍 Problem

**Localhost:** ✅ SMS balance displays correctly
**Production (eazzypay.online):** ❌ SMS balance returns 400 error

**Error Details:**
```json
{
  "has_enabled": false,
  "has_username": false, 
  "has_apikey": false,
  "username_length": 0,
  "apikey_length": 0
}
```

This indicates that `process.env.SUPER_ADMIN_SMS_ENABLED`, `process.env.SUPER_ADMIN_SMS_USERNAME`, and `process.env.SUPER_ADMIN_SMS_API_KEY` are **undefined** in production.

## 🔬 Root Cause Investigation

### Why Localhost Works

On localhost, environment variables are read from:
1. `.env.local` file (if exists) - **Highest priority**
2. `.env` file (if exists)
3. System environment variables

If localhost works, you likely have a `.env.local` file with:
```bash
SUPER_ADMIN_SMS_ENABLED=true
SUPER_ADMIN_SMS_USERNAME=your_username
SUPER_ADMIN_SMS_API_KEY=your_api_key
```

### Why Production Doesn't Work

Digital Ocean App Platform handles environment variables differently:

1. **Build Time vs Runtime Variables**
   - Digital Ocean separates **BUILD_TIME** and **RUN_TIME** variables
   - Next.js API routes need variables at **runtime** (not build time)
   - However, the variables might be set for build time only

2. **Variable Scope**
   - Variables can be set at **App Level** (all components)
   - Variables can be set at **Component Level** (specific services)
   - Component-level variables override app-level

3. **Environment-Specific Variables**
   - Variables can be set for specific environments
   - Make sure variables are set for **Production** environment

## 🔧 Step-by-Step Fix

### Step 1: Test Current State

I've created a diagnostic endpoint. Test it:

1. **Open browser console on eazzypay.online:**
   ```javascript
   fetch('https://eazzypay.online/api/test-env')
     .then(r => r.json())
     .then(data => {
       console.log('Environment Check:', data)
       console.log('SMS Credentials:', data.sms_credentials)
       console.log('Diagnostic:', data.diagnostic)
     })
   ```

2. **This will show:**
   - If ANY environment variables are loading
   - Specifically which SMS variables are missing
   - Total environment variable count

### Step 2: Verify Variables in Digital Ocean

1. **Go to Digital Ocean App Platform:**
   - https://cloud.digitalocean.com/apps
   - Click your `eazzypay` app

2. **Settings → App-Level Environment Variables:**
   - Check that these **EXACT** names exist (case-sensitive):
     - `SUPER_ADMIN_SMS_ENABLED`
     - `SUPER_ADMIN_SMS_USERNAME`
     - `SUPER_ADMIN_SMS_API_KEY`

3. **Check Variable Values:**
   - `SUPER_ADMIN_SMS_ENABLED` should be exactly `true` (no quotes, no spaces)
   - `SUPER_ADMIN_SMS_USERNAME` should be your actual username
   - `SUPER_ADMIN_SMS_API_KEY` should be your actual API key

4. **Check Variable Scope:**
   - Make sure they're set for **"App-Level"** (not component-level)
   - Make sure they're enabled for **"Runtime"** (or "Build and Runtime")

### Step 3: Critical Digital Ocean Settings

**⚠️ IMPORTANT:** In Digital Ocean, environment variables have two settings:

1. **Apply to:**
   - ✅ Check **"Runtime"** (required for API routes)
   - ✅ Optionally check **"Build"** (only needed if used during build)

2. **Environment:**
   - ✅ Check **"Production"** (or "All Environments")

### Step 4: Add/Update Variables Correctly

1. **For each variable:**

   **Variable Name:** `SUPER_ADMIN_SMS_ENABLED`
   - **Value:** `true`
   - **Apply to:** ☑️ Runtime ☑️ Build (optional)
   - **Environment:** ☑️ Production
   - **Scope:** App-Level

   **Variable Name:** `SUPER_ADMIN_SMS_USERNAME`
   - **Value:** `your_actual_username` (no quotes)
   - **Apply to:** ☑️ Runtime
   - **Environment:** ☑️ Production
   - **Scope:** App-Level

   **Variable Name:** `SUPER_ADMIN_SMS_API_KEY`
   - **Value:** `your_actual_api_key` (no quotes)
   - **Apply to:** ☑️ Runtime
   - **Environment:** ☑️ Production
   - **Scope:** App-Level

### Step 5: Redeploy (CRITICAL)

**⚠️ AFTER adding/updating variables, you MUST redeploy:**

1. **Digital Ocean App Platform:**
   - Go to your app
   - Click **"Actions"** dropdown
   - Click **"Force Rebuild and Deploy"**
   - Wait for deployment to complete (5-10 minutes)

2. **Why redeploy is needed:**
   - Digital Ocean injects environment variables during deployment
   - Old deployments don't have new variables
   - Next.js needs variables at runtime, but they're injected at deploy time

### Step 6: Verify After Redeploy

1. **Test the diagnostic endpoint again:**
   ```javascript
   fetch('https://eazzypay.online/api/test-env')
     .then(r => r.json())
     .then(data => {
       console.log('After Redeploy:', data)
       if (data.sms_credentials.has_super_admin_sms_username) {
         console.log('✅ SMS credentials found!')
       } else {
         console.log('❌ Still missing:', data.sms_credentials)
       }
     })
   ```

2. **Expected result:**
   ```json
   {
     "sms_credentials": {
       "has_super_admin_sms_enabled": true,
       "has_super_admin_sms_username": true,
       "has_super_admin_sms_api_key": true,
       "super_admin_sms_username_length": 12,
       "super_admin_sms_api_key_length": 32
     }
   }
   ```

3. **Test SMS balance:**
   - Open https://eazzypay.online
   - Login as super_admin
   - Check top bar - SMS balance should display

## 🐛 Common Issues

### Issue 1: Variables Set but Not for Runtime

**Symptom:** Variables exist in dashboard but aren't available at runtime

**Fix:** Make sure variables are set for **"Runtime"** in Digital Ocean

### Issue 2: Variables Set for Wrong Environment

**Symptom:** Variables exist but only for Preview/Development

**Fix:** Make sure variables are set for **"Production"** environment

### Issue 3: Component-Level Override

**Symptom:** App-level variables exist but component has empty values

**Fix:** Check component-level variables in Digital Ocean - remove or update them

### Issue 4: Typo in Variable Name

**Symptom:** Variables exist but slightly different name

**Fix:** Check exact spelling:
- ✅ `SUPER_ADMIN_SMS_ENABLED` (correct)
- ❌ `SUPER_ADMIN_SMS_ENABLE` (missing D)
- ❌ `super_admin_sms_enabled` (lowercase)

### Issue 5: Not Redeployed

**Symptom:** Variables added but old deployment still running

**Fix:** **Force Rebuild and Deploy** after adding variables

## 🔍 Debugging Checklist

- [ ] Diagnostic endpoint `/api/test-env` shows variables exist
- [ ] Variables are set at **App-Level** in Digital Ocean
- [ ] Variables are enabled for **Runtime** in Digital Ocean
- [ ] Variables are enabled for **Production** environment
- [ ] Variable names are **exactly** correct (case-sensitive)
- [ ] Variable values are **not empty** and **not quoted**
- [ ] App was **redeployed** after adding variables
- [ ] Deployment completed successfully
- [ ] Tested after deployment completed

## 📝 Quick Test Script

Run this in browser console on eazzypay.online:

```javascript
// Test 1: Check environment variables
fetch('/api/test-env')
  .then(r => r.json())
  .then(data => {
    console.log('=== Environment Check ===')
    console.log('SMS Enabled:', data.sms_credentials.has_super_admin_sms_enabled)
    console.log('SMS Username:', data.sms_credentials.has_super_admin_sms_username)
    console.log('SMS API Key:', data.sms_credentials.has_super_admin_sms_api_key)
    console.log('Total Env Vars:', data.total_env_vars_count)
    console.log('All SMS Keys:', data.sms_credentials.all_sms_related_keys)
  })

// Test 2: Check SMS balance
fetch('/api/sms/balance', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('=== SMS Balance Check ===')
    console.log('Success:', data.success)
    console.log('Balance:', data.balance)
    if (data.debug) {
      console.log('Debug:', data.debug)
    }
  })
```

## ✅ Expected Final Result

After fixing:
- ✅ `/api/test-env` shows all SMS variables exist
- ✅ `/api/sms/balance` returns `success: true` with balance
- ✅ SMS balance displays in top bar on eazzypay.online

