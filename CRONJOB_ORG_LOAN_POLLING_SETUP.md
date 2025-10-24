# 🕐 Cron-Job.org Setup for Loan Polling

## 🎯 Overview
This guide will help you set up cron-job.org to automatically trigger your deployed `loan-polling` Edge Function every 10 minutes.

## 📋 Setup Instructions

### 1. Login to Cron-Job.org
- Go to [https://cron-job.org](https://cron-job.org)
- Login to your account (or create one if you don't have it)

### 2. Create New Cron Job

#### Basic Settings:
- **Title**: `Payment Vault - Loan Polling`
- **Address**: `https://mapgmmiobityxaaevomv.supabase.co/functions/v1/loan-polling`
- **Schedule**: `*/10 * * * *` (Every 10 minutes)

#### Advanced Settings (Click "ADVANCED" tab):

**HTTP Method**: `POST`

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU2NTU3NSwiZXhwIjoyMDczMTQxNTc1fQ.zCUrGjs9Rn1j2GQgNjQJ20VLsvfi5UkW28G9O_PL1EI
Content-Type: application/json
x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU2NTU3NSwiZXhwIjoyMDczMTQxNTc1fQ.zCUrGjs9Rn1j2GQgNjQJ20VLsvfi5UkW28G9O_PL1EI
```

**Request Body**:
```json
{}
```

**Timeout**: `60` seconds

### 3. Save and Test

1. Click **"CREATE"** to save the cron job
2. Click **"TEST RUN"** to test the configuration
3. You should see a **200 OK** response

## 🧪 Testing the Setup

### Expected Test Response:
```json
{
  "success": true,
  "message": "Loan polling process completed",
  "partners_checked": 1,
  "loans_found": 0,
  "loans_processed": 0,
  "results": [
    {
      "partner_id": "c0bf511b-b197-46e8-ac28-a4231772c8d2",
      "partner_name": "Umoja Magharibi",
      "success": true,
      "loans_found": 0,
      "loans_processed": 0,
      "message": "No approved loans found"
    }
  ]
}
```

## 📊 Monitoring Your Cron Job

### 1. Cron-Job.org Dashboard
- View execution history
- Monitor success/failure rates
- Check response times
- Set up email notifications for failures

### 2. Supabase Edge Function Logs
- Go to Supabase Dashboard → Edge Functions → loan-polling → Logs
- Monitor detailed execution logs
- Check for errors or performance issues

### 3. Database Monitoring
- Check `loan_tracking` table for new records
- Monitor `disbursement_requests` for auto-disbursements
- Use the monitoring script: `node monitor-loan-polling.js`

## ⚙️ Configuration Options

### Schedule Options:
- **Every 5 minutes**: `*/5 * * * *`
- **Every 10 minutes**: `*/10 * * * *` (Recommended)
- **Every 15 minutes**: `*/15 * * * *`
- **Every 30 minutes**: `*/30 * * * *`

### Notification Settings:
- **Email alerts** for failures
- **Webhook notifications** (optional)
- **Success/failure thresholds**

## 🔧 Troubleshooting

### Common Issues:

#### 1. "401 Unauthorized" Error
- **Cause**: Incorrect Authorization header
- **Solution**: Verify the Bearer token is correct and properly formatted

#### 2. "404 Not Found" Error
- **Cause**: Incorrect URL or function not deployed
- **Solution**: Verify the Edge Function URL and deployment status

#### 3. "Timeout" Error
- **Cause**: Function taking too long to execute
- **Solution**: Increase timeout to 60+ seconds

#### 4. "No Response" Error
- **Cause**: Network issues or function errors
- **Solution**: Check Supabase Edge Function logs for detailed errors

### Debug Commands:
```bash
# Test the Edge Function directly
curl -X POST "https://mapgmmiobityxaaevomv.supabase.co/functions/v1/loan-polling" \
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

## 🎉 Ready to Deploy!

Your loan polling system is now ready to run automatically via cron-job.org! The system will:

- ✅ **Run every 10 minutes** without manual intervention
- ✅ **Fetch pending loans** from all configured Mifos X partners
- ✅ **Process auto-disbursements** when configured
- ✅ **Provide comprehensive logging** and monitoring
- ✅ **Integrate with your existing systems** (wallets, retries, tracking)

**Your Payment Vault Enhancement is now complete with fully automated loan polling!** 🚀


