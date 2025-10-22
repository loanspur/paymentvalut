# Balance Check Flow Investigation - Step by Step Analysis

## 🔍 **Complete Balance Check Flow**

### **Step 1: Frontend Trigger**
```
User clicks "Trigger Balance Check" 
→ /api/balance/official-balances (POST)
→ /api/balance/trigger-check (POST)
→ Supabase Edge Function: balance-monitor
```

### **Step 2: Edge Function Processing**
```
balance-monitor function:
1. Gets partner configurations from balance_monitoring_config
2. Checks if balance check is due (interval-based)
3. Gets partner M-Pesa credentials from vault
4. Calls getCurrentBalance() function
```

### **Step 3: M-Pesa API Call**
```
getCurrentBalance() function:
1. Gets M-Pesa access token
2. Constructs balance request payload:
   {
     "Initiator": "initiator_name",
     "SecurityCredential": "encrypted_credential",
     "CommandID": "AccountBalance",
     "PartyA": "partner_shortcode",
     "IdentifierType": "4",
     "Remarks": "balance inquiry",
     "QueueTimeOutURL": "callback_url",
     "ResultURL": "callback_url"
   }
3. Makes POST request to SafariCom API:
   - Production: https://api.safaricom.co.ke/mpesa/accountbalance/v1/query
   - Sandbox: https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query
```

### **Step 4: SafariCom Response Processing**
```
SafariCom responds with:
{
  "ResponseCode": "0",  // 0 = success, other = error
  "ResponseDescription": "Success",
  "ConversationID": "unique_id",
  "OriginatorConversationID": "unique_id"
}

If successful:
- Balance request stored in balance_requests table with status 'pending'
- Function waits 35 seconds for callback
- Checks for completed balance data
```

### **Step 5: SafariCom Callback**
```
SafariCom calls: /functions/v1/mpesa-balance-result

Callback payload structure:
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,  // 0 = success
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "id",
    "ConversationID": "id",
    "TransactionID": "id",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "AccountBalance",
          "Value": "1000.00"
        },
        {
          "Key": "B2CUtilityAccountAvailableFunds",
          "Value": "500.00"
        },
        {
          "Key": "B2CWorkingAccountAvailableFunds",
          "Value": "1000.00"
        },
        {
          "Key": "B2CChargesAccountAvailableFunds",
          "Value": "200.00"
        }
      ]
    }
  }
}
```

### **Step 6: Callback Processing**
```
mpesa-balance-result function:
1. Finds balance request by ConversationID
2. Extracts balance data from ResultParameters
3. Updates balance_requests table with:
   - status: 'completed' or 'failed'
   - utility_account_balance
   - working_account_balance
   - charges_account_balance
   - callback_received_at timestamp
```

## 🚨 **Potential Issues & Investigation Points**

### **Issue 1: No Balance Data in Database**
**Symptoms:** Kulman shows "No Data" in transaction monitoring
**Possible Causes:**
- No recent balance requests for Kulman
- All balance requests failed
- Callbacks not being received
- Database not being updated

### **Issue 2: M-Pesa API Authentication**
**Symptoms:** Balance requests fail with authentication errors
**Possible Causes:**
- Invalid consumer key/secret
- Expired access token
- Wrong environment (sandbox vs production)
- Invalid security credential

### **Issue 3: Callback Not Received**
**Symptoms:** Balance requests stuck in 'pending' status
**Possible Causes:**
- Callback URL not accessible from SafariCom
- Network/firewall issues
- Callback function errors
- SafariCom service issues

### **Issue 4: Wrong Balance Data Structure**
**Symptoms:** Balance data exists but shows wrong values
**Possible Causes:**
- Incorrect field mapping in callback handler
- Wrong account type being queried
- Data corruption in database

### **Issue 5: Timing Issues**
**Symptoms:** Balance checks timeout or take too long
**Possible Causes:**
- 35-second wait time insufficient
- SafariCom response delays
- Network latency issues

## 🔧 **Investigation Steps**

### **Step 1: Check Partner Configuration**
```sql
-- Run: investigate-balance-check-flow.sql
-- Look for:
- Partner exists and is active
- M-Pesa shortcode configured
- Balance monitoring enabled
```

### **Step 2: Check Recent Balance Requests**
```sql
-- Look for:
- Recent balance requests for Kulman
- Request status (pending, completed, failed)
- Result codes and descriptions
- Callback timing
```

### **Step 3: Check M-Pesa Credentials**
```sql
-- Look for:
- Shared M-Pesa credentials exist
- Consumer key/secret configured
- Security credential available
- Correct environment setting
```

### **Step 4: Check Callback Data**
```sql
-- Look for:
- M-Pesa response data in balance_requests
- Callback received timestamps
- Extracted balance values
- Error messages
```

### **Step 5: Test Balance Check Manually**
```bash
# Trigger balance check for Kulman specifically
curl -X POST http://localhost:3000/api/balance/trigger-check \
  -H "Content-Type: application/json" \
  -d '{"partner_id": "kulman_partner_id", "force_check": true}'
```

## 📊 **Expected SafariCom Response Codes**

| Code | Description | Action |
|------|-------------|---------|
| 0 | Success | Process balance data |
| 1 | Pending | Wait for callback |
| 2 | Failed | Check error details |
| 1001 | Invalid Access Token | Refresh token |
| 1002 | Invalid Request | Check request format |
| 1003 | Invalid Party | Check shortcode |
| 1004 | Invalid Initiator | Check initiator name |

## 🎯 **Next Steps**

1. **Run the investigation SQL script** to get current status
2. **Check recent balance requests** for Kulman specifically
3. **Verify M-Pesa credentials** are properly configured
4. **Test balance check manually** to see real-time response
5. **Check callback logs** for any errors
6. **Verify network connectivity** to SafariCom APIs

This comprehensive analysis should help identify exactly where the balance check process is failing for Kulman and other partners.

