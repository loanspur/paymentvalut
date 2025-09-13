# 🚨 Kulman Group Disbursement Debugging Guide

## 🔍 **Current Issue Analysis**

**Problem:** Button shows "Disbursement Accepted" but transaction doesn't complete end-to-end.

**Symptoms:**
- ✅ Button responds (not static)
- ✅ Shows "Disbursement Accepted" message
- ❌ No SMS received from M-Pesa
- ❌ No money sent to phone
- ❌ Status stuck on "accepted" (not "success")

---

## 🔍 **Step-by-Step Debugging Process**

### **Step 1: Check Browser Console Logs**

**Open browser developer tools (F12) and look for these logs:**

```javascript
// Should see these logs when you click "Send Disbursement":
🚀 Starting disbursement request: {
  partner: "Kulman Group Limited",
  amount: "5",
  msisdn: "2547XXXXXXXX",
  apiKey: "kulmna_sk_..."
}

📡 API Response status: 200
📡 API Response data: {
  status: "accepted",
  disbursement_id: "some-uuid",
  conversation_id: "AG_1234567890_abc123",
  will_callback: true
}
```

**If you DON'T see these logs:**
- ❌ UI JavaScript error
- ❌ Network request not being sent
- ❌ API route not responding

### **Step 2: Check Next.js API Route Logs**

**Look in your terminal where `npm run dev` is running:**

```bash
# Should see these logs:
🚀 Disbursement request received: {
  body: {
    amount: 5,
    msisdn: "2547XXXXXXXX",
    partner_id: "550e8400-e29b-41d4-a716-446655440000"
  },
  apiKey: "kulmna_sk_..."
}

Forwarding to Edge Function: https://your-project.supabase.co/functions/v1/disburse

📡 Edge Function response: {
  status: 200,
  data: {
    status: "accepted",
    disbursement_id: "some-uuid",
    conversation_id: "AG_1234567890_abc123"
  }
}
```

**If you DON'T see these logs:**
- ❌ API route not receiving requests
- ❌ Network connectivity issue
- ❌ Supabase URL/Key configuration issue

### **Step 3: Check Supabase Edge Function Logs**

**Go to Supabase Dashboard → Edge Functions → disburse function:**

**Look for these logs:**
```bash
# Should see:
API key validation: PASSED
Partner found: Kulman Group Limited
M-Pesa credentials: CONFIGURED
M-Pesa API call: STARTED
M-Pesa API response: {
  ResultCode: 0,
  ResultDesc: "Success",
  ConversationID: "AG_1234567890_abc123"
}
```

**If you see errors:**
- ❌ `Invalid API key` → API key hash mismatch
- ❌ `Partner M-Pesa credentials not configured` → Database has placeholder values
- ❌ `M-Pesa API error` → Safaricom API call failed

### **Step 4: Check Database Credentials**

**Run this SQL query in Supabase Dashboard:**

```sql
SELECT 
    name,
    mpesa_shortcode,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_environment,
    is_mpesa_configured,
    mpesa_initiator_name,
    api_key_hash
FROM partners 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

**Expected Results:**
```sql
name: "Kulman Group Limited"
mpesa_shortcode: "174379"
mpesa_consumer_key: "REAL_CONSUMER_KEY"  -- NOT "YOUR_MPESA_CONSUMER_KEY_1"
mpesa_consumer_secret: "REAL_CONSUMER_SECRET"  -- NOT "YOUR_MPESA_CONSUMER_SECRET_1"
mpesa_passkey: "REAL_PASSKEY"  -- NOT "YOUR_MPESA_PASSKEY_1"
mpesa_environment: "production"  -- NOT "sandbox"
is_mpesa_configured: true
mpesa_initiator_name: "REAL_INITIATOR_NAME"  -- NOT NULL
api_key_hash: "59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539"
```

**If you see placeholder values:**
- ❌ Migration not applied
- ❌ Database not updated with real credentials

### **Step 5: Check M-Pesa API Response**

**In Edge Function logs, look for:**

```bash
# M-Pesa API call details:
Base URL: https://api.safaricom.co.ke  -- Should be production URL
Access Token: SUCCESS  -- Should get valid token
B2C Request: {
  InitiatorName: "REAL_INITIATOR_NAME",
  SecurityCredential: "REAL_PASSKEY",
  CommandID: "BusinessPayment",
  Amount: 5,
  PartyA: "174379",
  PartyB: "2547XXXXXXXX"
}

# M-Pesa API Response:
ResultCode: 0  -- Success
ResultDesc: "Success"
ConversationID: "AG_1234567890_abc123"
```

**If ResultCode is NOT 0:**
- ❌ Invalid credentials
- ❌ Insufficient account balance
- ❌ Invalid phone number
- ❌ Account not configured for B2C

---

## 🚨 **Common Failure Points**

### **Failure Point 1: API Key Hash Mismatch**
**Symptoms:**
- Edge Function logs: "Invalid API key"
- Status: "rejected"

**Fix:**
```sql
UPDATE partners 
SET api_key_hash = '59c7bc6570f96ee12409bb81b5d6fdf993a6f793dd1db8e566adf654b143b539'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### **Failure Point 2: Placeholder Credentials**
**Symptoms:**
- Edge Function logs: "M-Pesa credentials not configured"
- Status: "rejected"

**Fix:**
```sql
UPDATE partners 
SET 
    mpesa_consumer_key = 'REAL_CONSUMER_KEY',
    mpesa_consumer_secret = 'REAL_CONSUMER_SECRET',
    mpesa_passkey = 'REAL_PASSKEY',
    mpesa_environment = 'production',
    mpesa_initiator_name = 'REAL_INITIATOR_NAME'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### **Failure Point 3: M-Pesa API Rejection**
**Symptoms:**
- Edge Function logs: "M-Pesa API error"
- ResultCode: Not 0
- Status: "rejected"

**Possible Causes:**
- Invalid credentials from Safaricom
- Insufficient account balance
- Phone number not registered with M-Pesa
- Account not configured for B2C transactions

### **Failure Point 4: Missing Callback Functions**
**Symptoms:**
- Status stuck on "accepted"
- No status updates to "success"
- No SMS received

**Fix:**
```bash
npx supabase functions deploy mpesa-b2c-timeout
npx supabase functions deploy mpesa-b2c-result
```

---

## 🔧 **Immediate Action Items**

### **1. Check Current Database State**
```sql
-- Run this query to see current credentials:
SELECT 
    name,
    mpesa_consumer_key,
    mpesa_environment,
    is_mpesa_configured,
    api_key_hash
FROM partners 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### **2. Test with Enhanced Logging**
1. **Open browser console** (F12)
2. **Click "Send Disbursement"**
3. **Check console logs** for the 🚀 and 📡 messages
4. **Check terminal logs** for API route messages
5. **Check Supabase Edge Function logs**

### **3. Verify Real Credentials**
- **Confirm** you have real M-Pesa credentials from Safaricom
- **Update** the migration file with real values
- **Apply** the migration to database

### **4. Test M-Pesa API Directly**
```bash
# Test if credentials work with M-Pesa API directly
curl -X GET "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic $(echo -n 'CONSUMER_KEY:CONSUMER_SECRET' | base64)"
```

---

## 🎯 **Expected Success Flow**

### **✅ Complete Success Indicators:**
1. **UI:** "Disbursement Accepted" with disbursement ID
2. **API Route:** Returns conversation ID
3. **Edge Function:** M-Pesa API returns ResultCode: 0
4. **Database:** Status updates to "accepted"
5. **M-Pesa:** Sends SMS notification
6. **Phone:** Money received
7. **Database:** Status updates to "success" via callback
8. **Dashboard:** Shows transaction receipt

### **❌ Current Issue:**
- Steps 1-4 are working (shows "accepted")
- Steps 5-8 are failing (no SMS, no money, no success status)

**This indicates the M-Pesa API call is failing or using invalid credentials.**

---

## 🚀 **Next Steps**

1. **Check the logs** using the steps above
2. **Identify the exact failure point**
3. **Update database with real credentials** if needed
4. **Test again** with enhanced logging
5. **Verify M-Pesa API response** in Edge Function logs

**The system architecture is correct - we need to identify where the M-Pesa integration is failing.**





