# Mifos X Webhook Configuration Guide

## 🎯 Objective
Configure Mifos X to send webhooks to our Payment Vault system when loans are approved.

## 📋 Prerequisites
- ✅ Mifos X system accessible at `https://system.loanspur.com`
- ✅ Admin access to Mifos X
- ✅ Partner configured in Payment Vault with correct webhook URL
- ✅ Webhook endpoint tested and working

## 🔧 Step-by-Step Configuration

### Step 1: Access Mifos X Admin Panel

1. **Login to Mifos X**:
   - URL: `https://system.loanspur.com`
   - Username: `admin`
   - Password: [Your admin password]

2. **Navigate to Admin Panel**:
   - Click on your username in the top-right corner
   - Select "Admin" from the dropdown menu

### Step 2: Configure Webhook Settings

1. **Find Webhook Configuration**:
   - Look for "Configuration" or "System Configuration" in the admin menu
   - Search for "Webhook" or "External Integration" settings
   - Alternative: Look for "API Configuration" or "Integration Settings"

2. **Create New Webhook** (if not exists):
   ```
   Webhook Name: Payment Vault Integration
   Webhook URL: https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval
   HTTP Method: POST
   Content Type: application/json
   Status: Active/Enabled
   ```

3. **Configure Webhook Events**:
   - ✅ **Loan Status Changes**
   - ✅ **Loan Approval Events**
   - ✅ **Status: Approved**
   - ✅ **Status: Waiting for Disbursal**

### Step 3: Alternative Configuration Methods

#### Method A: Through System Configuration
1. Go to **Admin** → **System Configuration**
2. Look for **"External Integrations"** or **"Webhooks"**
3. Add new webhook configuration

#### Method B: Through API Configuration
1. Go to **Admin** → **API Configuration**
2. Look for **"Webhook Settings"** or **"External Notifications"**
3. Configure webhook endpoint

#### Method C: Through Loan Product Settings
1. Go to **Admin** → **Loan Products**
2. Edit the loan product you want to test
3. Look for **"Integration Settings"** or **"Webhook Configuration"**
4. Add webhook URL for loan approvals

### Step 4: Webhook Payload Configuration

If Mifos X allows custom payload configuration, use this structure:
```json
{
  "officeId": "{{officeId}}",
  "clientId": "{{clientId}}",
  "loanId": "{{loanId}}",
  "resourceId": "{{resourceId}}",
  "changes": {
    "status": {
      "id": "{{status.id}}",
      "code": "{{status.code}}",
      "value": "{{status.value}}",
      "pendingApproval": "{{status.pendingApproval}}",
      "waitingForDisbursal": "{{status.waitingForDisbursal}}",
      "active": "{{status.active}}",
      "closedObligationsMet": "{{status.closedObligationsMet}}",
      "closedWrittenOff": "{{status.closedWrittenOff}}",
      "closedRescheduled": "{{status.closedRescheduled}}",
      "closed": "{{status.closed}}",
      "overpaid": "{{status.overpaid}}"
    },
    "locale": "en",
    "dateFormat": "dd MMMM yyyy",
    "approvedOnDate": "{{approvedOnDate}}",
    "expectedDisbursementDate": "{{expectedDisbursementDate}}"
  }
}
```

## 🧪 Testing the Configuration

### Step 1: Test Webhook Endpoint
```bash
# Run this to verify webhook endpoint is working
node test-webhook-endpoint.js
```

### Step 2: Approve a Test Loan
1. **Go to Loans** in Mifos X
2. **Find a loan** that's pending approval
3. **Approve the loan** (change status to "Approved")
4. **Check Vercel logs** for POST requests

### Step 3: Monitor Vercel Logs
1. Go to your Vercel dashboard
2. Navigate to **Functions** → **Logs**
3. Look for POST requests to `/api/mifos/webhook/loan-approval`
4. Check for successful webhook processing

## 🔍 Troubleshooting

### Issue 1: No Webhook Configuration Found
**Solution**: Mifos X might not have built-in webhook support
- Check if there's a **"Custom Integration"** or **"External API"** section
- Look for **"Event Notifications"** or **"System Events"**
- Consider using **Mifos X API** to poll for loan status changes

### Issue 2: Webhook URL Not Accepting
**Solution**: Check URL format and accessibility
- Ensure URL is exactly: `https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval`
- Test URL accessibility from browser
- Check if Mifos X requires HTTPS

### Issue 3: Webhook Not Triggering
**Solution**: Check event configuration
- Ensure webhook is configured for **"Loan Status Changes"**
- Verify **"Approved"** status is included in events
- Check if webhook is **Active/Enabled**

### Issue 4: Authentication Issues
**Solution**: Add authentication if required
- Check if Mifos X requires API key or token
- Add authentication headers if needed
- Update webhook handler to handle authentication

## 📞 Alternative: API Polling Method

If webhook configuration is not available, we can implement API polling:

1. **Create a scheduled job** to check for approved loans
2. **Poll Mifos X API** every few minutes
3. **Process approved loans** automatically
4. **Update loan status** after disbursement

## ✅ Success Criteria

After configuration, you should see:
- ✅ POST requests in Vercel logs to `/api/mifos/webhook/loan-approval`
- ✅ New records in loan tracking dashboard
- ✅ Disbursement records being created
- ✅ Loan status updates in Mifos X

## 🚀 Next Steps

1. **Configure webhook in Mifos X** using the steps above
2. **Test with a real loan approval**
3. **Monitor Vercel logs** for webhook activity
4. **Verify loan tracking** dashboard shows new records
5. **Move to Phase 3: SMS Integration** once webhook is working

---

**Need Help?** If you can't find webhook configuration in Mifos X, let me know and I'll help you implement the API polling method instead.
