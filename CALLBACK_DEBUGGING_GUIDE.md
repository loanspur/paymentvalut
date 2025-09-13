# 🔍 M-Pesa Callback Debugging Guide

## 🎯 **Objective: Verify if Safaricom is sending callbacks to our system**

---

## 📋 **Step 1: Check if Conversation ID is Generated**

### **In Browser Console (F12):**
Look for this log when you submit a disbursement:
```javascript
📡 API Response data: {
  status: "accepted",
  disbursement_id: "some-uuid",
  conversation_id: "AG_1234567890_abc123",  // ← This should be present
  will_callback: true
}
```

### **In Terminal (PowerShell):**
Look for this log:
```bash
📡 Edge Function response: {
  status: 200,
  data: {
    status: "accepted",
    conversation_id: "AG_1234567890_abc123"  // ← This should be present
  }
}
```

**If conversation_id is present:** ✅ M-Pesa API call was successful
**If conversation_id is missing:** ❌ M-Pesa API call failed

---

## 📋 **Step 2: Check Supabase Edge Function Logs**

### **Go to Supabase Dashboard:**
1. **Navigate to:** Edge Functions → disburse function
2. **Check logs for:**
   - M-Pesa API call success/failure
   - Conversation ID generation
   - Any error messages

### **Look for these logs:**
```bash
# Success case:
M-Pesa API call: SUCCESS
Conversation ID: AG_1234567890_abc123
ResultCode: 0
ResultDesc: Success

# Failure case:
M-Pesa API call: FAILED
ResultCode: [error code]
ResultDesc: [error message]
```

---

## 📋 **Step 3: Check Callback Functions**

### **Check if callback functions are deployed:**
1. **Go to:** Supabase Dashboard → Edge Functions
2. **Verify these functions exist:**
   - `mpesa-b2c-timeout` ✅
   - `mpesa-b2c-result` ✅

### **Check callback function logs:**
1. **Click on `mpesa-b2c-result` function**
2. **Check logs for incoming callbacks**
3. **Look for:**
   ```bash
   M-Pesa B2C Result callback received: [timestamp]
   Result callback data: { ... }
   ```

**If you see callback logs:** ✅ Safaricom is sending callbacks
**If no callback logs:** ❌ Safaricom is not sending callbacks

---

## 📋 **Step 4: Check Database for Callback Records**

### **Run this SQL in Supabase Dashboard:**
```sql
-- Check for callback records
SELECT 
    callback_type,
    conversation_id,
    result_code,
    result_desc,
    created_at
FROM mpesa_callbacks 
WHERE conversation_id LIKE 'AG_%'
ORDER BY created_at DESC 
LIMIT 10;
```

### **Check disbursement status updates:**
```sql
-- Check disbursement status changes
SELECT 
    id,
    status,
    conversation_id,
    result_code,
    result_desc,
    created_at,
    updated_at
FROM disbursement_requests 
WHERE conversation_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;
```

**If you see callback records:** ✅ System is receiving and processing callbacks
**If no callback records:** ❌ System is not receiving callbacks

---

## 📋 **Step 5: Test Callback URL Accessibility**

### **Check if callback URLs are accessible:**
The system uses these callback URLs:
- **Timeout:** `https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-timeout`
- **Result:** `https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-result`

### **Test with curl:**
```bash
# Test timeout callback
curl -X POST https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-timeout \
  -H "Content-Type: application/json" \
  -d '{"test": "callback"}'

# Test result callback
curl -X POST https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-result \
  -H "Content-Type: application/json" \
  -d '{"test": "callback"}'
```

**Expected response:** `OK` (status 200)
**If error:** ❌ Callback URLs are not accessible

---

## 🚨 **Common Issues and Solutions:**

### **Issue 1: No Conversation ID Generated**
**Cause:** M-Pesa API call failing
**Solution:** Check M-Pesa credentials and API endpoint

### **Issue 2: Conversation ID Generated but No Callbacks**
**Cause:** Safaricom not sending callbacks
**Possible reasons:**
- Callback URLs not accessible from Safaricom servers
- Invalid credentials
- Account not configured for B2C
- Insufficient account balance

### **Issue 3: Callbacks Received but Not Processed**
**Cause:** Callback function errors
**Solution:** Check callback function logs for errors

### **Issue 4: Callbacks Processed but Status Not Updated**
**Cause:** Database update errors
**Solution:** Check database permissions and constraints

---

## 🎯 **Debugging Checklist:**

- [ ] **Conversation ID generated?** (Check browser/terminal logs)
- [ ] **M-Pesa API call successful?** (Check Edge Function logs)
- [ ] **Callback functions deployed?** (Check Supabase Dashboard)
- [ ] **Callback URLs accessible?** (Test with curl)
- [ ] **Callbacks being received?** (Check callback function logs)
- [ ] **Callbacks being processed?** (Check database for callback records)
- [ ] **Status being updated?** (Check disbursement status in database)

---

## 📞 **Next Steps Based on Results:**

### **If Conversation ID is Generated:**
1. **Check callback function logs** for incoming callbacks
2. **Test callback URL accessibility**
3. **Check database for callback records**

### **If No Conversation ID:**
1. **Check M-Pesa API call logs** in Edge Function
2. **Verify M-Pesa credentials** are correct
3. **Check account balance** and B2C configuration

### **If Callbacks Not Received:**
1. **Contact Safaricom** to verify callback configuration
2. **Check if account is properly configured** for B2C
3. **Verify callback URLs** are accessible from external networks

**Run through this checklist and share the results so I can help identify the exact issue!**





