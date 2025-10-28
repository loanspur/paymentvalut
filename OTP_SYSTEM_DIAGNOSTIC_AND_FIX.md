# OTP System Diagnostic and Fix Guide

## 🔍 **Issues Identified:**

### **1. Missing Environment Variables**
- `RESEND_API_KEY` - Required for email sending
- `RESEND_FROM_EMAIL` - Required for email sending  
- `SUPER_ADMIN_SMS_ENABLED` - Required for SMS sending
- `SUPER_ADMIN_SMS_USERNAME` - Required for SMS sending
- `SUPER_ADMIN_SMS_API_KEY` - Required for SMS sending
- `SUPER_ADMIN_SMS_SENDER_ID` - Required for SMS sending

### **2. Missing System Settings**
- `login_otp_enabled` setting not configured in database

### **3. User Verification Status**
- Users need `email_verified` and `phone_verified` to be `true`

## 🔧 **Step-by-Step Fix:**

### **Step 1: Configure Environment Variables**

Add these to your `.env.local` file:

```bash
# Email Configuration (Resend.com)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# SMS Configuration (AirTouch)
SUPER_ADMIN_SMS_ENABLED=true
SUPER_ADMIN_SMS_SENDER_ID=PaymentVault
SUPER_ADMIN_SMS_USERNAME=your_airtouch_username
SUPER_ADMIN_SMS_API_KEY=your_airtouch_api_key
SUPER_ADMIN_SMS_PASSWORD=your_airtouch_password
```

### **Step 2: Configure System Settings**

Run this SQL in Supabase SQL Editor:

```sql
-- Enable OTP login system
INSERT INTO system_settings (category, setting_key, setting_value, description) 
VALUES 
('otp', 'login_otp_enabled', 'true', 'Enable OTP login verification'),
('otp', 'otp_expiry_minutes', '10', 'OTP expiry time in minutes'),
('otp', 'otp_max_attempts', '3', 'Maximum OTP validation attempts'),
('otp', 'otp_length', '6', 'OTP code length')
ON CONFLICT (setting_key) DO UPDATE SET 
setting_value = EXCLUDED.setting_value,
description = EXCLUDED.description;
```

### **Step 3: Verify User Status**

Check if users have verified email and phone:

```sql
-- Check user verification status
SELECT 
  id,
  email,
  phone_number,
  email_verified,
  phone_verified,
  email_verified_at,
  phone_verified_at
FROM users 
WHERE email = 'your_email@example.com';
```

### **Step 4: Test OTP Generation**

Test the OTP generation endpoint:

```bash
curl -X POST https://your-domain.com/api/auth/otp/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=your_jwt_token" \
  -d '{}'
```

## 🚨 **Common Issues and Solutions:**

### **Issue 1: "Email service not configured"**
**Solution**: Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` environment variables

### **Issue 2: "No SMS settings found"**
**Solution**: Set `SUPER_ADMIN_SMS_ENABLED=true` and SMS credentials

### **Issue 3: "OTP validation required"**
**Solution**: Ensure `login_otp_enabled` is set to `true` in system_settings

### **Issue 4: "User not verified"**
**Solution**: Complete email and phone verification first

## 📧 **Email Setup (Resend.com):**

1. **Sign up** at [resend.com](https://resend.com)
2. **Get API key** from dashboard
3. **Add domain** (optional but recommended)
4. **Set environment variables**

## 📱 **SMS Setup (AirTouch):**

1. **Get credentials** from AirTouch
2. **Set environment variables**
3. **Test SMS sending**

## 🧪 **Testing Steps:**

1. **Check environment variables** are loaded
2. **Verify system settings** in database
3. **Test email sending** with Resend
4. **Test SMS sending** with AirTouch
5. **Test OTP generation** endpoint
6. **Test OTP validation** endpoint

## 📊 **Monitoring:**

Check logs for:
- `✅ OTP email sent successfully`
- `✅ SMS OTP sent successfully`
- `❌ Email sending failed`
- `❌ SMS OTP failed`

## 🔄 **Deployment:**

1. **Update environment variables** in Vercel
2. **Run SQL commands** in Supabase
3. **Test OTP system** in production
4. **Monitor logs** for errors
