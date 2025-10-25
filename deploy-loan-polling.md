# 🚀 Loan Polling System Deployment Instructions

## ✅ System Status
- ✅ **Database Schema**: Fixed and working
- ✅ **Partners Configuration**: 1 active partner with Mifos X config
- ✅ **Auto-Disbursal Config**: 1 active configuration
- ✅ **API Endpoint**: Created and ready
- ✅ **Vercel Configuration**: Updated with cron job
- ⏳ **Edge Function**: Ready for deployment

## 📋 Deployment Steps

### 1. Deploy the Edge Function

You need to deploy the `loan-polling` Edge Function to Supabase. You can do this in two ways:

#### Option A: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy loan-polling
```

#### Option B: Using Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name it `loan-polling`
5. Copy the code from `supabase/functions/loan-polling/index.ts`
6. Click **Deploy**

### 2. Deploy to Vercel

```bash
# Deploy your Next.js app to Vercel
vercel --prod
```

### 3. Verify Cron Job Configuration

Your `vercel.json` should contain:
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

### 4. Test the System

After deployment, run:
```bash
node test-loan-polling-system.js
```

## 🧪 Testing Commands

### Test the Complete System
```bash
node test-loan-polling-system.js
```

### Monitor System Health
```bash
node monitor-loan-polling.js
```

### Test API Endpoint Locally
```bash
# Start your dev server first
npm run dev

# Then test the endpoint
curl -X POST "http://localhost:3000/api/cron/loan-polling" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-cron-secret" \
  -d "{}"
```

## 📊 Expected Results

After successful deployment, you should see:

### 1. Automatic Execution
- **Every 10 minutes**: Vercel cron job triggers
- **API call**: `/api/cron/loan-polling` endpoint called
- **Edge Function**: `loan-polling` function executes
- **Partner polling**: Each partner with Mifos X config is polled
- **Loan discovery**: New pending loans are found and tracked
- **Auto-disbursement**: Loans with auto-disbursal config are processed

### 2. Database Updates
- New records in `loan_tracking` table
- New disbursement requests in `disbursement_requests` table
- Wallet transactions for charges (if configured)

### 3. Monitoring
- Supabase Edge Function logs show execution details
- Vercel function logs show cron job execution
- Admin dashboard shows loan tracking activity

## 🔧 Configuration

### Current Configuration
- **Partner**: Umoja Magharibi
- **Mifos URL**: https://system.loanspur.com
- **Auto-Disbursal**: Enabled for Product ID 5
- **Polling Frequency**: Every 10 minutes
- **Retry Frequency**: Every 5 minutes

### Adding More Partners
1. Add partner to `partners` table with Mifos X configuration
2. Create auto-disbursal config in `loan_product_auto_disbursal_configs`
3. System will automatically include them in polling

## 🚨 Troubleshooting

### Common Issues

#### 1. "Function not found" Error
- **Cause**: Edge Function not deployed
- **Solution**: Deploy the `loan-polling` function to Supabase

#### 2. "No active partners found"
- **Cause**: Partners not configured or inactive
- **Solution**: Check `partners` table for active partners with Mifos X config

#### 3. "Mifos X API error"
- **Cause**: Invalid credentials or network issues
- **Solution**: Verify Mifos X credentials and connectivity

#### 4. "Auto-disbursement failed"
- **Cause**: Missing M-Pesa config or insufficient balance
- **Solution**: Check partner M-Pesa configuration and wallet balance

## 📈 Monitoring

### Key Metrics to Watch
- **Polling Success Rate**: Should be >95%
- **Loan Discovery Rate**: Number of new loans found per day
- **Auto-Disbursement Success Rate**: Should be >90%
- **Processing Time**: Should be <30 seconds per partner

### Monitoring Tools
- **Supabase Dashboard**: Edge Function logs
- **Vercel Dashboard**: Function logs and cron job status
- **Admin Dashboard**: `/loan-tracking` page
- **Monitoring Script**: `node monitor-loan-polling.js`

## 🎯 Next Steps

After successful deployment:

1. **Monitor for 24 hours** to ensure stable operation
2. **Check loan discovery** - verify new loans are being found
3. **Verify auto-disbursements** - ensure loans are being processed
4. **Set up alerts** for failures or high error rates
5. **Add more partners** as needed
6. **Optimize polling frequency** based on usage patterns

## 🎉 Success Criteria

Your loan polling system is successfully deployed when:
- ✅ Edge Function is deployed and accessible
- ✅ Cron job runs every 10 minutes without errors
- ✅ New loans are discovered and tracked
- ✅ Auto-disbursements are processed successfully
- ✅ All monitoring tools show healthy status

---

## 🚀 Ready to Deploy!

Your loan polling system is ready for deployment. Follow the steps above to deploy the Edge Function and start automatic loan polling from your Mifos X partners!



