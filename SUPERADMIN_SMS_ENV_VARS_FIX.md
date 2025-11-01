# Super Admin SMS Environment Variables Fix

## ✅ Changes Made

Updated SMS sending and balance inquiry endpoints to prioritize environment variables for super_admin/admin users when deployed on Digital Ocean App Platform.

## 📝 Updated Endpoints

### 1. **SMS Balance API** (`app/api/sms/balance/route.ts`)
- ✅ Already checks environment variables first for super_admin/admin
- ✅ Uses `SUPER_ADMIN_SMS_ENABLED`, `SUPER_ADMIN_SMS_USERNAME`, `SUPER_ADMIN_SMS_API_KEY`
- ✅ Falls back to database only if env vars not set

### 2. **SMS Send API** (`app/api/sms/send/route.ts`) - **FIXED**
- ✅ Now checks environment variables first for super_admin/admin
- ✅ Uses env vars when `SUPER_ADMIN_SMS_ENABLED=true` and user is super_admin/admin
- ✅ Falls back to database partner SMS settings for regular users

### 3. **Bulk SMS Campaign API** (`app/api/admin/sms/campaigns/[id]/send/route.ts`) - **FIXED**
- ✅ Now checks environment variables first for super_admin/admin
- ✅ Uses env vars when `SUPER_ADMIN_SMS_ENABLED=true` and user is super_admin/admin
- ✅ Falls back to database partner SMS settings if env vars not enabled

### 4. **OTP Generate API** (`app/api/auth/otp/generate/route.ts`)
- ✅ Already uses environment variables for super_admin/admin
- ✅ No changes needed

## 🔧 How It Works

### For Super Admin/Admin Users:

1. **Check Environment Variables First:**
   ```typescript
   const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true'
   if ((payload.role === 'super_admin' || payload.role === 'admin') && superAdminSmsEnabled) {
     // Use environment variables (fastest path, no database query)
     username = process.env.SUPER_ADMIN_SMS_USERNAME
     apiKey = process.env.SUPER_ADMIN_SMS_API_KEY
     senderId = process.env.SUPER_ADMIN_SMS_SENDER_ID || 'eazzypay'
   }
   ```

2. **Fallback to Database:**
   ```typescript
   else {
     // Query database for partner SMS settings
     // Decrypt credentials if encrypted
   }
   ```

### For Regular Users:
- Always uses database partner SMS settings
- No environment variable check

## 📋 Required Environment Variables

Add these to Digital Ocean App Platform:

```bash
SUPER_ADMIN_SMS_ENABLED=true
SUPER_ADMIN_SMS_USERNAME=your_airtouch_username
SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key
SUPER_ADMIN_SMS_SENDER_ID=eazzypay  # Optional, defaults to 'eazzypay'
```

## ✅ Benefits

1. **Faster Performance:**
   - No database query needed for super_admin/admin
   - Instant credential retrieval from environment

2. **Better for Digital Ocean:**
   - Environment variables are configured in App Platform dashboard
   - No need to store credentials in database
   - Easier to manage and rotate credentials

3. **Security:**
   - Credentials not stored in database for super admin
   - Can be rotated via environment variables without code changes
   - No decryption needed for env vars

4. **Flexibility:**
   - Can easily switch between env vars and database
   - Regular users still use database settings
   - Fallback mechanism ensures reliability

## 🔄 Migration Path

1. **Set Environment Variables in Digital Ocean:**
   - Go to App Platform Dashboard
   - Settings → App-Level Environment Variables
   - Add the 3 required variables

2. **Redeploy:**
   - Push to GitHub (triggers auto-deploy)
   - Or create new deployment

3. **Verify:**
   - Test SMS balance inquiry (should use env vars)
   - Test SMS sending (should use env vars)
   - Test OTP generation (should use env vars)

## 🧪 Testing

### Test SMS Balance:
```javascript
fetch('/api/sms/balance', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Balance:', data))
```

### Test SMS Sending:
- Use the SMS send endpoint as super_admin
- Should use environment variables
- Check App Platform logs for confirmation

## 📝 Notes

- Environment variables take precedence over database settings for super_admin/admin
- If `SUPER_ADMIN_SMS_ENABLED=false` or not set, falls back to database
- Regular users always use database partner SMS settings
- All endpoints now consistently prioritize env vars for super_admin

