# Safaricom API Fix Guide

## 🔍 **Current Status**

Based on the investigation, we need to identify and fix the credential issues. Here's a step-by-step approach:

## 📋 **Step 1: Run Focused Investigation**

Run the `focused-credential-investigation.sql` script to get specific data about:
- What credential columns exist in the partners table
- What credentials are actually stored
- Recent failed balance requests
- Successful balance requests (if any)

## 🔧 **Step 2: Fix Credential Structure**

Run the `fix-safaricom-credentials.sql` script to:
- Add missing credential columns to the partners table
- Create the shared_mpesa_credentials table
- Set up default credential structure

## 🎯 **Step 3: Update with Real Credentials**

After running the fix script, you'll need to update the credentials with actual values:

### **For Sandbox Environment:**
```sql
UPDATE shared_mpesa_credentials 
SET 
    consumer_key = 'YOUR_ACTUAL_SANDBOX_CONSUMER_KEY',
    consumer_secret = 'YOUR_ACTUAL_SANDBOX_CONSUMER_SECRET',
    initiator_password = 'YOUR_ACTUAL_SANDBOX_INITIATOR_PASSWORD',
    security_credential = 'YOUR_ACTUAL_SANDBOX_SECURITY_CREDENTIAL',
    initiator_name = 'YOUR_ACTUAL_SANDBOX_INITIATOR_NAME'
WHERE name = 'default_sandbox';
```

### **For Production Environment:**
```sql
INSERT INTO shared_mpesa_credentials (
    name, environment, consumer_key, consumer_secret, 
    initiator_password, security_credential, initiator_name, is_active
) VALUES (
    'default_production', 'production', 
    'YOUR_ACTUAL_PRODUCTION_CONSUMER_KEY',
    'YOUR_ACTUAL_PRODUCTION_CONSUMER_SECRET',
    'YOUR_ACTUAL_PRODUCTION_INITIATOR_PASSWORD',
    'YOUR_ACTUAL_PRODUCTION_SECURITY_CREDENTIAL',
    'YOUR_ACTUAL_PRODUCTION_INITIATOR_NAME',
    true
);
```

## 🔑 **Step 4: Verify Environment Variables**

Check that these environment variables are set in Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `MPESA_VAULT_PASSPHRASE` - Passphrase for credential encryption

## 🌐 **Step 5: Test Callback URLs**

Verify that your callback URLs are accessible:
- `https://your-project.supabase.co/functions/v1/mpesa-balance-result`

## 🧪 **Step 6: Test the Fix**

1. **Trigger a balance check** from the UI
2. **Monitor the logs** for any errors
3. **Check the database** for new balance requests
4. **Verify callbacks** are received

## 🚨 **Common Issues and Solutions**

### **Issue 1: Missing Credentials**
**Solution:** Run the fix script and update with real credentials

### **Issue 2: Wrong Environment**
**Solution:** Ensure partners are configured for the correct environment (sandbox/production)

### **Issue 3: Callback URL Not Accessible**
**Solution:** Verify Supabase URL and edge function deployment

### **Issue 4: Security Credential Issues**
**Solution:** Ensure security credential is properly encrypted

### **Issue 5: OAuth Token Generation Fails**
**Solution:** Verify consumer key/secret are correct

## 📊 **Expected Results After Fix**

1. **Partners have proper credentials** stored
2. **Balance checks are triggered** successfully
3. **Safaricom accepts requests** (ResponseCode = 0)
4. **Callbacks are received** with balance data
5. **Frontend displays fresh balance** information

## 🎯 **Next Steps**

1. Run the focused investigation script
2. Run the fix script
3. Update credentials with real values
4. Test the balance check functionality
5. Monitor for successful callbacks

The root cause is likely missing or incorrect credentials. Once we fix the credential structure and add real values, the balance checks should work properly!

