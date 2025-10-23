# 🚀 Loan Polling System Deployment Guide

## Overview
This guide covers the deployment of the automatic loan polling system that fetches pending loans from Mifos X partners and processes them for disbursement.

## 🏗️ System Architecture

### Components
1. **Supabase Edge Function** (`loan-polling`) - Core polling logic
2. **API Endpoint** (`/api/cron/loan-polling`) - Cron job trigger
3. **Vercel Cron Job** - Scheduled execution every 10 minutes
4. **Database Tables** - Loan tracking and auto-disbursal configs

### Flow
```
Vercel Cron (every 10 min) 
    ↓
API Endpoint (/api/cron/loan-polling)
    ↓
Supabase Edge Function (loan-polling)
    ↓
Fetch Partners with Mifos X Config
    ↓
For Each Partner:
    ↓
Fetch Pending Loans from Mifos X
    ↓
Create Loan Tracking Records
    ↓
Check Auto-Disbursal Config
    ↓
Trigger Auto-Disbursement (if configured)
```

## 📋 Deployment Steps

### 1. Deploy the Edge Function

```bash
# Deploy the loan-polling Edge Function
supabase functions deploy loan-polling
```

### 2. Deploy to Vercel

```bash
# Deploy your Next.js app to Vercel
vercel --prod
```

### 3. Verify Cron Job Configuration

The `vercel.json` file should contain:
```json
{
  "crons": [
    {
      "path": "/api/cron/disburse-retry",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/loan-polling",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### 4. Set Environment Variables

Ensure these environment variables are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (optional, for additional security)

## 🧪 Testing

### 1. Test the API Endpoint Locally

```bash
# Start your development server
npm run dev

# In another terminal, test the endpoint
node test-loan-polling-system.js
```

### 2. Test the Edge Function Directly

```bash
# Test the Edge Function
curl -X POST "https://your-project.supabase.co/functions/v1/loan-polling" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{}"
```

### 3. Monitor System Health

```bash
# Run the monitoring script
node monitor-loan-polling.js
```

## 📊 Monitoring & Logs

### 1. Supabase Edge Function Logs
- Go to Supabase Dashboard → Edge Functions → loan-polling → Logs
- Monitor execution times, errors, and success rates

### 2. Vercel Function Logs
- Go to Vercel Dashboard → Functions → View Function Logs
- Monitor cron job execution and API endpoint performance

### 3. Database Monitoring
- Check `loan_tracking` table for new records
- Monitor `disbursement_requests` for auto-disbursements
- Review `loan_product_auto_disbursal_configs` for configuration status

## ⚙️ Configuration

### 1. Partner Setup
Ensure each partner has:
- `mifos_host_url` - Mifos X server URL
- `mifos_username` - Mifos X username
- `mifos_password` - Mifos X password
- `mifos_tenant_id` - Mifos X tenant ID
- `is_active` = true

### 2. Auto-Disbursal Configuration
For automatic disbursement, configure:
- `loan_product_auto_disbursal_configs` table
- Set `auto_disbursal_enabled` = true
- Ensure partner has M-Pesa configuration

### 3. Cron Schedule
Current schedule: Every 10 minutes (`*/10 * * * *`)
- Adjust based on your needs
- Consider Mifos X server load
- Balance between responsiveness and resource usage

## 🔧 Troubleshooting

### Common Issues

#### 1. "No active partners found"
- Check `partners` table for `is_active` = true
- Verify Mifos X configuration fields are not null

#### 2. "Mifos X API error"
- Verify Mifos X credentials
- Check network connectivity
- Ensure Mifos X server is accessible

#### 3. "Auto-disbursement failed"
- Check partner M-Pesa configuration
- Verify phone number format
- Ensure sufficient wallet balance (if charges configured)

#### 4. "Cron job not running"
- Verify `vercel.json` configuration
- Check Vercel deployment status
- Monitor Vercel function logs

### Debug Commands

```bash
# Test specific partner
node test-partner-credentials.js

# Check loan tracking records
node check-specific-loan.js

# Monitor system health
node monitor-loan-polling.js

# Test complete flow
node test-loan-polling-system.js
```

## 📈 Performance Optimization

### 1. Batch Processing
- Process multiple partners in parallel
- Limit number of loans per partner per run
- Implement pagination for large loan sets

### 2. Caching
- Cache partner configurations
- Store Mifos X authentication tokens
- Implement rate limiting

### 3. Error Handling
- Implement exponential backoff for API failures
- Log detailed error information
- Set up alerting for critical failures

## 🚨 Alerts & Notifications

### Recommended Alerts
1. **High Error Rate** - >10% of polling attempts fail
2. **No Activity** - No loans processed in 24 hours
3. **API Failures** - Mifos X API consistently failing
4. **Auto-Disbursement Failures** - High failure rate for auto-disbursements

### Monitoring Dashboard
- Use the loan tracking dashboard at `/loan-tracking`
- Monitor disbursement retry dashboard at `/admin/disbursement-retries`
- Set up custom alerts in your monitoring system

## 🔒 Security Considerations

### 1. API Security
- Use `CRON_SECRET` for additional security
- Validate all input parameters
- Implement rate limiting

### 2. Data Protection
- Encrypt sensitive Mifos X credentials
- Use secure connections (HTTPS)
- Implement proper access controls

### 3. Audit Logging
- Log all polling activities
- Track configuration changes
- Monitor access patterns

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Mifos X API Documentation](https://mifosforge.jira.com/wiki/spaces/docs/pages/50257/Mifos+X+API)
- [Payment Vault Enhancement PRD](./PAYMENT_VAULT_ENHANCEMENT_PRD.md)

## 🎯 Success Metrics

### Key Performance Indicators
- **Polling Success Rate** - >95% successful polling attempts
- **Loan Discovery Rate** - Number of new loans found per day
- **Auto-Disbursement Success Rate** - >90% successful auto-disbursements
- **Processing Time** - <30 seconds per partner polling cycle

### Monitoring Frequency
- **Real-time** - Edge Function logs and error rates
- **Daily** - Loan discovery and processing statistics
- **Weekly** - System performance and optimization opportunities
- **Monthly** - Overall system health and capacity planning

---

## 🎉 Deployment Complete!

Your automatic loan polling system is now deployed and will:
- ✅ **Run every 10 minutes** automatically
- ✅ **Fetch pending loans** from all configured Mifos X partners
- ✅ **Create tracking records** for new loans
- ✅ **Trigger auto-disbursements** when configured
- ✅ **Provide comprehensive logging** and monitoring

Monitor the system using the provided scripts and dashboards, and adjust the configuration as needed for optimal performance.

