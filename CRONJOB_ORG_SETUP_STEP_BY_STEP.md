# 🕐 Cron-Job.org Setup for Loan Polling - Step by Step

## 🎯 Overview
This guide will walk you through setting up cron-job.org to automatically trigger your deployed `loan-polling` Edge Function every 10 minutes.

## 📋 Prerequisites
- ✅ **Edge Function Deployed**: `loan-polling` function is deployed and working
- ✅ **Service Role Key**: Your Supabase service role key
- ✅ **Cron-Job.org Account**: Free account at [https://cron-job.org](https://cron-job.org)

## 🔑 Your Service Role Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU2NTU3NSwiZXhwIjoyMDczMTQxNTc1fQ.zCUrGjs9Rn1j2GQgNjQJ20VLsvfi5UkW28G9O_PL1EI
```

## 📝 Step-by-Step Setup

### Step 1: Login to Cron-Job.org
1. **Go to**: [https://cron-job.org](https://cron-job.org)
2. **Login** to your account (or create one if you don't have it)
3. **Click**: "Create cronjob" or "New cronjob"

### Step 2: Basic Configuration
Fill in the basic settings:

**Title**: 
```
Payment Vault - Loan Polling
```

**Address**: 
```
https://mapgmmiobityxaaevomp.supabase.co/functions/v1/loan-polling
```

**Schedule**: 
```
*/10 * * * *
```
*(This means every 10 minutes)*

### Step 3: Advanced Configuration
Click the **"ADVANCED"** tab to configure the HTTP request:

**HTTP Method**: 
```
POST
```

**Headers** (click "Add Header" for each):
```
Header 1:
Name: Authorization
Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU2NTU3NSwiZXhwIjoyMDczMTQxNTc1fQ.zCUrGjs9Rn1j2GQgNjQJ20VLsvfi5UkW28G9O_PL1EI

Header 2:
Name: Content-Type
Value: application/json

Header 3:
Name: x-api-key
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU2NTU3NSwiZXhwIjoyMDczMTQxNTc1fQ.zCUrGjs9Rn1j2GQgNjQJ20VLsvfi5UkW28G9O_PL1EI
```

**Request Body**:
```json
{}
```

**Timeout**: 
```
60
```
*(60 seconds)*

### Step 4: Additional Settings
**User Agent**: Leave empty (use default)

**Follow Redirects**: ✅ Check this box

**SSL Verification**: ✅ Check this box

**Notifications**: 
- ✅ Check "Email on failure"
- Enter your email address

### Step 5: Save and Test
1. **Click**: "CREATE" to save the cron job
2. **Click**: "TEST RUN" to test the configuration
3. **Check**: The test result should show "200 OK"

## 🧪 Expected Test Results

### Successful Test Response:
```json
{
  "success": true,
  "message": "Loan polling process completed",
  "partners_checked": 1,
  "loans_found": 100,
  "loans_processed": 0,
  "results": [
    {
      "partner_id": "c0bf511b-b197-46e8-ac28-a4231772c8d2",
      "partner_name": "Umoja Magharibi",
      "success": true,
      "loans_found": 100,
      "loans_processed": 0,
      "message": "No loans waiting for disbursal"
    }
  ]
}
```

### What This Means:
- ✅ **Partners checked**: 1 (Umoja Magharibi)
- ✅ **Loans found**: 100 (total approved loans)
- ✅ **Loans processed**: 0 (no loans waiting for disbursal)
- ✅ **System working**: Edge Function is responding correctly

## 📊 Monitoring Your Cron Job

### 1. Cron-Job.org Dashboard
- **Execution History**: View all runs and their results
- **Success Rate**: Monitor success/failure rates
- **Response Times**: Check how long each execution takes
- **Error Logs**: View detailed error messages if any

### 2. Supabase Edge Function Logs
- **Go to**: Supabase Dashboard → Edge Functions → loan-polling → Logs
- **Monitor**: Detailed execution logs
- **Check**: Partner processing and loan discovery

### 3. Database Monitoring
- **Check**: `loan_tracking` table for new records
- **Monitor**: `disbursement_requests` for auto-disbursements
- **Use**: `node monitor-loan-polling.js` script

## ⚙️ Schedule Options

### Current Schedule: Every 10 minutes
```
*/10 * * * *
```

### Alternative Schedules:
- **Every 5 minutes**: `*/5 * * * *`
- **Every 15 minutes**: `*/15 * * * *`
- **Every 30 minutes**: `*/30 * * * *`
- **Every hour**: `0 * * * *`
- **Every 2 hours**: `0 */2 * * * *`

## 🔧 Troubleshooting

### Common Issues:

#### 1. "401 Unauthorized" Error
- **Cause**: Incorrect Authorization header
- **Solution**: Verify the Bearer token is correct and properly formatted

#### 2. "404 Not Found" Error
- **Cause**: Incorrect URL or function not deployed
- **Solution**: Verify the Edge Function URL is correct

#### 3. "Timeout" Error
- **Cause**: Function taking too long to execute
- **Solution**: Increase timeout to 60+ seconds

#### 4. "DNS Lookup" Error
- **Cause**: Network/DNS issues
- **Solution**: Try again later, or use alternative cron service

### Debug Commands:
```bash
# Test the Edge Function directly
curl -X POST "https://mapgmmiobityxaaevomp.supabase.co/functions/v1/loan-polling" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{}"

# Monitor system health
node monitor-loan-polling.js
```

## 📈 Expected Performance

### Normal Operation:
- **Execution Time**: 5-30 seconds per run
- **Success Rate**: >95%
- **Partners Processed**: 1 (Umoja Magharibi)
- **Loans Found**: Varies based on Mifos X activity

### When Loans Are Found:
- **Tracking Records**: Created in `loan_tracking` table
- **Auto-Disbursements**: Triggered if configured
- **Wallet Deductions**: Applied for charges
- **Mifos X Updates**: Loan status updated after disbursement

## 🎯 Success Criteria

Your cron job is working correctly when:
- ✅ **Test Run** returns 200 OK
- ✅ **Execution Logs** show successful partner processing
- ✅ **Database** shows new loan tracking records (when loans exist)
- ✅ **No Error Alerts** in cron-job.org dashboard

## 🚀 Next Steps

After successful setup:

1. **Monitor for 24 hours** to ensure stable operation
2. **Check loan discovery** - verify new loans are being found
3. **Verify auto-disbursements** - ensure loans are being processed
4. **Set up email alerts** for failures
5. **Optimize schedule** based on usage patterns

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase Edge Function logs
3. Test the function manually with curl
4. Verify your Supabase service role key

---

## 🎉 Ready to Set Up!

Your loan polling system is ready for cron-job.org setup! Follow the steps above to configure automatic loan polling every 10 minutes.

**Key Points:**
- ✅ Edge Function is deployed and working
- ✅ Service role key is provided
- ✅ Configuration is detailed step-by-step
- ✅ Expected results are defined
- ✅ Troubleshooting guide is included

**Your Payment Vault will then have fully automated loan polling!** 🚀


