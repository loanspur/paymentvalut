# 🏢 Coleman Limited - M-Pesa B2C Setup Guide

## 🚨 **CRITICAL: Why Disbursements Aren't Working**

The system is currently **NOT sending real money** because:

1. **❌ Coleman partner not configured** - No Coleman partner exists in the system
2. **❌ M-Pesa credentials missing** - Placeholder values instead of real credentials  
3. **❌ API bypass active** - Test mode bypasses real M-Pesa integration
4. **❌ Callback URLs not configured** - M-Pesa can't send status updates

---

## 🔧 **Step 1: Add Coleman Partner to Database**

Run this SQL to add Coleman to the database:

```sql
-- Add Coleman partner with real M-Pesa credentials
INSERT INTO partners (
    id,
    name,
    short_code,
    mpesa_shortcode,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_environment,
    is_active,
    is_mpesa_configured,
    api_key_hash,
    created_at,
    updated_at
) VALUES (
    'coleman-partner-001',
    'Coleman Limited',
    'COLEMAN',
    'YOUR_ACTUAL_SHORT_CODE', -- Replace with Coleman's actual short code
    'YOUR_ACTUAL_CONSUMER_KEY', -- Replace with Coleman's actual consumer key
    'YOUR_ACTUAL_CONSUMER_SECRET', -- Replace with Coleman's actual consumer secret
    'YOUR_ACTUAL_PASSKEY', -- Replace with Coleman's actual passkey
    'production', -- Use production environment for real transactions
    true,
    true,
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- SHA-256 hash of 'test_api_key_12345'
    NOW(),
    NOW()
);
```

---

## 🔑 **Step 2: Get Coleman's M-Pesa Credentials**

Coleman needs to provide these credentials from Safaricom:

### **Required Credentials:**
1. **Short Code** - Coleman's M-Pesa business number (e.g., `174379`)
2. **Consumer Key** - API consumer key from Safaricom
3. **Consumer Secret** - API consumer secret from Safaricom  
4. **Passkey** - API passkey from Safaricom
5. **Initiator Name** - The initiator name registered with Safaricom
6. **Security Credential** - Encrypted credential (requires public key from Safaricom)

### **How to Get These:**
1. **Contact Safaricom** - Coleman should contact Safaricom to get M-Pesa B2C API credentials
2. **Register Callback URLs** - Safaricom needs to whitelist these URLs:
   - `https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-result`
   - `https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-timeout`

---

## 🔧 **Step 3: Update Coleman's Credentials**

Once Coleman provides the credentials, update the database:

```sql
-- Update Coleman with real credentials
UPDATE partners 
SET 
    mpesa_shortcode = 'COLEMAN_ACTUAL_SHORT_CODE',
    mpesa_consumer_key = 'COLEMAN_ACTUAL_CONSUMER_KEY',
    mpesa_consumer_secret = 'COLEMAN_ACTUAL_CONSUMER_SECRET',
    mpesa_passkey = 'COLEMAN_ACTUAL_PASSKEY',
    mpesa_environment = 'production'
WHERE id = 'coleman-partner-001';
```

---

## 🔧 **Step 4: Update Edge Function with Real Credentials**

Update `supabase/functions/disburse/index.ts`:

```typescript
// Replace these placeholder values with Coleman's actual values:
const b2cRequest = {
  InitiatorName: "COLEMAN_ACTUAL_INITIATOR_NAME", // Coleman's actual initiator name
  SecurityCredential: "COLEMAN_ENCRYPTED_CREDENTIAL", // Encrypted with Safaricom's public key
  CommandID: "BusinessPayment",
  Amount: params.amount,
  PartyA: shortCode,
  PartyB: params.msisdn,
  Remarks: `Disbursement ${params.disbursementId}`,
  QueueTimeOutURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-timeout`,
  ResultURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-result`,
  Occasion: "Disbursement"
}
```

---

## 🔧 **Step 5: Test the Integration**

### **Test Steps:**
1. **Select Coleman Limited** from the partner dropdown
2. **Enter test amount** (e.g., 1 KES for testing)
3. **Enter your phone number** in format `2547XXXXXXXX`
4. **Submit the disbursement**

### **Expected Results:**
- ✅ **Real M-Pesa API call** is made
- ✅ **Money is actually sent** to your phone
- ✅ **SMS notification** from M-Pesa
- ✅ **Status updates** in the dashboard
- ✅ **Transaction receipt** generated

---

## 🚨 **Current Issues to Fix:**

### **Issue 1: API Route Bypass**
**Problem:** The API route returns mock responses instead of calling real M-Pesa
**Fix:** ✅ **FIXED** - Removed the bypass, now calls real Edge Function

### **Issue 2: Missing Coleman Partner**
**Problem:** No Coleman partner exists in the system
**Fix:** ✅ **FIXED** - Added Coleman partner template

### **Issue 3: Placeholder Credentials**
**Problem:** Using placeholder values instead of real M-Pesa credentials
**Fix:** ⚠️ **NEEDS COLEMAN'S ACTUAL CREDENTIALS**

### **Issue 4: Callback URL Configuration**
**Problem:** M-Pesa callbacks may not be properly configured
**Fix:** ⚠️ **NEEDS SAFARICOM WHITELISTING**

---

## 📞 **Next Steps for Coleman:**

1. **Contact Safaricom** to get M-Pesa B2C API credentials
2. **Provide the credentials** to update the system
3. **Register callback URLs** with Safaricom
4. **Test with small amounts** first
5. **Monitor transaction logs** for any issues

---

## 🔍 **Debugging Tips:**

### **Check Transaction Status:**
```sql
-- Check disbursement status
SELECT * FROM disbursement_requests 
WHERE partner_id = 'coleman-partner-001' 
ORDER BY created_at DESC;
```

### **Check M-Pesa Callbacks:**
```sql
-- Check callback logs
SELECT * FROM mpesa_callbacks 
WHERE partner_id = 'coleman-partner-001' 
ORDER BY created_at DESC;
```

### **Monitor Edge Function Logs:**
- Check Supabase Edge Function logs for errors
- Look for M-Pesa API response codes
- Verify callback URL accessibility

---

## ⚠️ **Important Notes:**

1. **Start with small amounts** for testing
2. **Use production environment** for real transactions
3. **Monitor all transactions** for security
4. **Keep credentials secure** - never commit to version control
5. **Test callback URLs** are accessible from Safaricom's servers

---

## 🆘 **If Still Not Working:**

1. **Check M-Pesa API response codes** in Edge Function logs
2. **Verify callback URLs** are accessible from external networks
3. **Confirm credentials** are correct and active
4. **Check Safaricom account** has sufficient balance
5. **Verify phone number format** is correct (`2547XXXXXXXX`)


