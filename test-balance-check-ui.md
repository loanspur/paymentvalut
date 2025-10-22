# Test Balance Monitor Function

## 🚀 **Function Deployed Successfully!**

The updated balance monitor function has been deployed with the same credential approach as the working disburse function.

## 🧪 **Testing Steps**

### **Step 1: Run the Fixed SQL Script**
Run the `sync-balance-monitor-with-disburse.sql` script in your Supabase dashboard to:
- Verify partner credentials are available
- Check recent disbursements with balance data
- Compare disbursement vs balance request data

### **Step 2: Test Balance Check from UI**
1. Go to `http://localhost:3000/transactions`
2. Click the **"Trigger Balance Check"** button
3. Wait for the process to complete (up to 40 seconds)
4. Check if balance data is now displayed

### **Step 3: Monitor the Results**
- Check the browser console for any errors
- Look for toast notifications about the balance check process
- Verify that balance data appears in the table

### **Step 4: Check Supabase Logs**
1. Go to your Supabase dashboard
2. Navigate to Functions → balance-monitor
3. Check the logs for any errors or success messages
4. Look for M-Pesa API calls and responses

## 🔍 **What to Look For**

### **Success Indicators:**
- ✅ Balance check completes without errors
- ✅ Fresh balance data appears in the UI
- ✅ No "No Data" messages in the balance column
- ✅ Logs show successful M-Pesa API calls

### **Error Indicators:**
- ❌ Balance check fails with credential errors
- ❌ No balance data appears after check
- ❌ Logs show M-Pesa API failures
- ❌ "No Data" still appears in balance column

## 🎯 **Expected Results**

Since the disburse function is working perfectly and using the same credentials, the balance monitor should now:
1. **Successfully authenticate** with Safaricom using the same credentials
2. **Make balance check requests** to Safaricom's Account Balance API
3. **Receive callbacks** with balance data
4. **Display fresh balance information** in the UI

## 🔧 **If Issues Persist**

If the balance monitor still doesn't work:
1. **Check the logs** in Supabase Functions dashboard
2. **Verify credentials** are properly stored for all partners
3. **Compare with disburse function** logs to see the difference
4. **Test with a single partner** first to isolate issues

The balance monitor now uses the exact same credential retrieval and API call approach as the working disburse function!

