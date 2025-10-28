# Super Admin SMS Configuration Guide

## 🚀 Environment Variables for Super Admin SMS

You can now configure SMS settings specifically for super admin users using environment variables. This gives you full control over which SMS service and credentials to use for OTP verification.

### 📋 Required Environment Variables

Add these to your `.env` file:

```bash
# Super Admin SMS Settings (for OTP verification)
SUPER_ADMIN_SMS_ENABLED=true
SUPER_ADMIN_SMS_SENDER_ID=PaymentVault
SUPER_ADMIN_SMS_USERNAME=your_sms_username
SUPER_ADMIN_SMS_API_KEY=your_sms_api_key
SUPER_ADMIN_SMS_PASSWORD=your_sms_password
```

### 🔧 Configuration Options

#### **SUPER_ADMIN_SMS_ENABLED**
- **Values**: `true` or `false`
- **Default**: `false`
- **Description**: Enable/disable SMS for super admin users
- **Example**: `SUPER_ADMIN_SMS_ENABLED=true`

#### **SUPER_ADMIN_SMS_SENDER_ID**
- **Values**: Any string (max 11 characters)
- **Default**: `PaymentVault`
- **Description**: The sender ID that appears on SMS messages
- **Example**: `SUPER_ADMIN_SMS_SENDER_ID=PaymentVault`

#### **SUPER_ADMIN_SMS_USERNAME**
- **Values**: Your SMS service username
- **Required**: Yes (if SMS enabled)
- **Description**: Username for your SMS service provider
- **Example**: `SUPER_ADMIN_SMS_USERNAME=your_username`

#### **SUPER_ADMIN_SMS_API_KEY**
- **Values**: Your SMS service API key
- **Required**: Yes (if SMS enabled)
- **Description**: API key for your SMS service provider
- **Example**: `SUPER_ADMIN_SMS_API_KEY=your_api_key`

#### **SUPER_ADMIN_SMS_PASSWORD**
- **Values**: Your SMS service password
- **Required**: No (optional)
- **Description**: Password for your SMS service provider (if required)
- **Example**: `SUPER_ADMIN_SMS_PASSWORD=your_password`

### 📱 How It Works

1. **Super Admin Login** → System checks `SUPER_ADMIN_SMS_ENABLED`
2. **If Enabled** → Uses environment variables for SMS settings
3. **If Disabled** → Falls back to database SMS settings
4. **SMS Sent** → Using your configured credentials

### 🎯 Example Configuration

```bash
# Enable super admin SMS
SUPER_ADMIN_SMS_ENABLED=true

# Set sender ID
SUPER_ADMIN_SMS_SENDER_ID=PaymentVault

# Set your SMS service credentials
SUPER_ADMIN_SMS_USERNAME=your_username_here
SUPER_ADMIN_SMS_API_KEY=your_api_key_here
SUPER_ADMIN_SMS_PASSWORD=your_password_here
```

### 🔄 Fallback Behavior

If `SUPER_ADMIN_SMS_ENABLED=false` or environment variables are not set, the system will:

1. **Check database** for available SMS settings
2. **Use first available** active SMS settings
3. **Log the fallback** in server logs

### 📊 Server Logs

When SMS is sent, you'll see logs like:

```
📱 Super admin detected, checking environment SMS settings
📱 Using environment variables for super admin SMS
✅ Super admin SMS settings from environment variables:
   Sender ID: PaymentVault
   Username: your_username
   API Key: ***1234
📱 Sending SMS OTP to: +254727638940
✅ SMS OTP sent successfully to: +254727638940
```

### 🛠️ Testing

1. **Add environment variables** to your `.env` file
2. **Restart the development server** (`npm run dev`)
3. **Login as super admin** (`justmurenga@gmail.com`)
4. **Check server logs** for SMS sending confirmation
5. **Verify SMS received** on your phone

### 🔒 Security Notes

- **Never commit** `.env` file to version control
- **Use strong credentials** for SMS service
- **Rotate API keys** regularly
- **Monitor SMS usage** for anomalies

### 🆘 Troubleshooting

**SMS not being sent?**
- Check if `SUPER_ADMIN_SMS_ENABLED=true`
- Verify all required environment variables are set
- Check server logs for error messages
- Ensure SMS service credentials are correct

**Using fallback settings?**
- Set `SUPER_ADMIN_SMS_ENABLED=true`
- Add all required environment variables
- Restart the server

---

**Ready to configure? Add the environment variables to your `.env` file and restart the server!** 🚀





