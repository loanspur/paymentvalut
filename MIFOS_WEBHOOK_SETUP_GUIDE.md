# Mifos X Webhook Setup Guide

## 🔍 Issue Diagnosis

Based on the investigation, we found that:
- ✅ **Webhook endpoint is working** - Tested successfully with 200 response
- ✅ **Application is processing webhooks** - Returns disbursement ID and status
- ❌ **Mifos X is not sending webhooks** - No POST requests in Vercel logs

## 🛠️ Solution: Configure Webhook in Mifos X

### Step 1: Access Mifos X Admin Panel

1. **Login to your Mifos X instance**: `https://system.loanspur.com`
2. **Navigate to Admin Panel** (usually in the top menu)
3. **Go to Configuration** → **Webhooks** (or similar)

### Step 2: Create/Configure Webhook

1. **Click "Add Webhook"** or **"Configure Webhook"**
2. **Set the following values**:

```
Webhook URL: https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval
HTTP Method: POST
Content Type: application/json
Events: Loan Status Changes
Status: Active/Enabled
```

### Step 3: Configure Webhook Events

Make sure the webhook is configured to trigger on:
- ✅ **Loan Status Changes**
- ✅ **Loan Approval Events**
- ✅ **Status: Approved**

### Step 4: Test the Configuration

1. **Save the webhook configuration**
2. **Approve a loan** in Mifos X
3. **Check Vercel logs** for POST requests to `/api/mifos/webhook/loan-approval`

## 🔧 Alternative: Check Existing Webhook Configuration

If webhooks are already configured, check:

1. **Webhook URL** - Must be exactly: `https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval`
2. **Webhook Status** - Must be "Active" or "Enabled"
3. **Event Triggers** - Must include "Loan Status Changes"
4. **Authentication** - May need API key or secret token

## 📋 Common Issues and Solutions

### Issue 1: Webhook URL Incorrect
**Problem**: Webhook URL in Mifos X doesn't match your Vercel deployment
**Solution**: Update webhook URL to: `https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval`

### Issue 2: Webhook Disabled
**Problem**: Webhook is configured but disabled
**Solution**: Enable the webhook in Mifos X admin panel

### Issue 3: Wrong Events
**Problem**: Webhook is not configured for loan status changes
**Solution**: Configure webhook to trigger on "Loan Status Changes" or "Loan Approval"

### Issue 4: Authentication Issues
**Problem**: Mifos X requires authentication for webhooks
**Solution**: Add API key or secret token to webhook configuration

## 🧪 Testing Steps

1. **Test webhook endpoint manually**:
   ```bash
   node test-webhook-endpoint.js
   ```

2. **Check partner configuration**:
   ```bash
   node check-partner-webhook-config.js
   ```

3. **Monitor Vercel logs** after approving a loan

4. **Check loan tracking dashboard** for new records

## 📞 Next Steps

1. **Update your Supabase credentials** in the diagnostic scripts
2. **Run the partner configuration check** to verify webhook URL
3. **Configure webhook in Mifos X** using the steps above
4. **Test by approving a loan** and checking Vercel logs

## 🔍 Verification

After configuration, you should see:
- ✅ POST requests in Vercel logs to `/api/mifos/webhook/loan-approval`
- ✅ New records in loan tracking dashboard
- ✅ Disbursement records being created
- ✅ Loan status updates in Mifos X
