# Resend.com Email Setup Guide

## 🚀 Quick Setup for Payment Vault OTP System

### 1. **Create Resend.com Account**
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. **Get Your API Key**
1. Log into your Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name like "Payment Vault Production"
5. Copy the API key (starts with `re_`)

### 3. **Add Domain (Optional but Recommended)**
1. Go to **Domains** section
2. Click **Add Domain**
3. Add your domain (e.g., `yourdomain.com`)
4. Follow DNS setup instructions
5. Wait for verification

### 4. **Environment Variables Setup**

Add these to your `.env.local` file:

```bash
# Resend.com Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Important Notes:**
- If you don't have a custom domain, you can use Resend's default domain: `onboarding@resend.dev`
- For production, always use a custom domain for better deliverability

### 5. **Test Email Sending**

The system will now automatically send:
- ✅ **OTP codes** for login verification
- ✅ **Email verification codes** for new users
- ✅ **Beautiful HTML emails** with Payment Vault branding

### 6. **Email Templates Included**

The system includes professional email templates for:

#### **Login OTP Email:**
- Payment Vault branded header
- Large, easy-to-read OTP code
- Security warnings
- Expiry time information

#### **Email Verification:**
- Welcome message
- Clear verification instructions
- One-time verification notice
- Professional styling

### 7. **Monitoring & Analytics**

Resend provides:
- 📊 **Email delivery analytics**
- 📈 **Open and click tracking**
- 🚨 **Bounce and complaint monitoring**
- 📋 **Email logs and history**

### 8. **Free Tier Limits**

Resend's free tier includes:
- ✅ **3,000 emails per month**
- ✅ **100 emails per day**
- ✅ **Unlimited domains**
- ✅ **API access**

### 9. **Production Recommendations**

For production use:
1. **Upgrade to paid plan** for higher limits
2. **Set up custom domain** for better deliverability
3. **Configure SPF/DKIM records** properly
4. **Monitor bounce rates** regularly
5. **Set up webhooks** for delivery events

### 10. **Troubleshooting**

**Common Issues:**

1. **"Email service not configured"**
   - Check `RESEND_API_KEY` is set correctly
   - Verify API key is valid

2. **"From email not configured"**
   - Check `RESEND_FROM_EMAIL` is set
   - Use verified domain email

3. **Emails not delivered**
   - Check spam folder
   - Verify domain DNS settings
   - Check Resend dashboard for errors

### 11. **Security Best Practices**

- ✅ **Never commit API keys** to version control
- ✅ **Use environment variables** for all secrets
- ✅ **Rotate API keys** regularly
- ✅ **Monitor email usage** for anomalies
- ✅ **Set up rate limiting** if needed

---

## 🎯 **Ready to Test!**

Once configured, your OTP login system will:
1. **Send OTP via SMS** (using existing AirTouch integration)
2. **Send OTP via Email** (using new Resend integration)
3. **Provide beautiful email templates**
4. **Handle verification flows** seamlessly

**Test the system by:**
1. Going to `/secure-login`
2. Logging in with existing credentials
3. Checking both SMS and email for OTP codes
4. Completing the verification process

---

*Need help? Check the Resend documentation at [resend.com/docs](https://resend.com/docs) or contact support.*





