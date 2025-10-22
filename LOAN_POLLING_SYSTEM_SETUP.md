# Loan Polling System Setup Guide

## 🎯 Overview

This system provides a reliable fallback to webhooks by periodically fetching pending loans from Mifos X and processing them automatically.

## 🔄 System Flow

```
1. Scheduled Job (every 5 minutes)
   ↓
2. Fetch Pending Loans from Mifos X
   ↓
3. Create Loan Tracking Records
   ↓
4. Process Loans for Disbursement
   ↓
5. Update Loan Status in Mifos X
```

## 📋 API Endpoints

### 1. Fetch Pending Loans
```
POST /api/mifos/fetch-pending-loans
```
- Fetches approved loans waiting for disbursal from Mifos X
- Creates loan tracking records for new loans
- Uses partner's Mifos X credentials

### 2. Process Pending Loans
```
POST /api/mifos/process-pending-loans
```
- Processes loans with status 'pending_disbursement'
- Creates disbursement records
- Triggers M-Pesa B2C disbursement
- Updates loan status in Mifos X

### 3. Scheduled Sync
```
POST /api/mifos/scheduled-loan-sync
```
- Runs both fetch and process operations
- Designed for cron job execution
- Returns comprehensive results

## 🚀 Setup Instructions

### Step 1: Deploy the APIs

The APIs are already created and ready to use:
- `app/api/mifos/fetch-pending-loans/route.ts`
- `app/api/mifos/process-pending-loans/route.ts`
- `app/api/mifos/scheduled-loan-sync/route.ts`

### Step 2: Test the System

```bash
# Test the loan polling system
node test-loan-polling-system.js
```

### Step 3: Set Up Cron Job

#### Option A: Vercel Cron Jobs (Recommended)

1. **Create `vercel.json` in project root:**
```json
{
  "crons": [
    {
      "path": "/api/mifos/scheduled-loan-sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

2. **Deploy to Vercel** - Cron jobs will be automatically set up

#### Option B: External Cron Service

Use services like:
- **Cron-job.org**: Free cron service
- **EasyCron**: Reliable cron service
- **SetCronJob**: Simple cron service

**Cron Configuration:**
```
URL: https://paymentvalut-ju.vercel.app/api/mifos/scheduled-loan-sync
Method: POST
Schedule: Every 5 minutes (*/5 * * * *)
```

#### Option C: Server Cron (if you have a server)

```bash
# Add to crontab
*/5 * * * * curl -X POST https://paymentvalut-ju.vercel.app/api/mifos/scheduled-loan-sync
```

## 🔧 Configuration

### Partner Requirements

Each partner must have:
- ✅ **Mifos X configured** (`is_mifos_configured = true`)
- ✅ **Auto disbursement enabled** (`mifos_auto_disbursement_enabled = true`)
- ✅ **Valid Mifos X credentials** (host, username, password, tenant)
- ✅ **Auto-disbursal configuration** in `loan_product_auto_disbursal_configs`

### Loan Product Configuration

Each loan product needs:
- ✅ **Enabled** (`enabled = true`)
- ✅ **Min/Max amounts** set
- ✅ **Auto approve** configured

## 📊 Monitoring

### Check Loan Tracking Dashboard

Visit: `http://localhost:3000/loan-tracking`

Look for:
- ✅ **New loan records** with status 'pending_disbursement'
- ✅ **Processing records** with status 'processing_disbursement'
- ✅ **Completed records** with status 'disbursed'

### Monitor API Logs

Check Vercel logs for:
- ✅ **Scheduled job executions**
- ✅ **Loan fetch results**
- ✅ **Disbursement processing**
- ✅ **Mifos X updates**

### Test Manual Execution

```bash
# Test individual components
curl -X POST https://paymentvalut-ju.vercel.app/api/mifos/fetch-pending-loans
curl -X POST https://paymentvalut-ju.vercel.app/api/mifos/process-pending-loans
curl -X POST https://paymentvalut-ju.vercel.app/api/mifos/scheduled-loan-sync
```

## 🎯 Benefits

### Reliability
- ✅ **No dependency on webhooks**
- ✅ **Automatic retry on failures**
- ✅ **Comprehensive error handling**

### Performance
- ✅ **Processes multiple loans efficiently**
- ✅ **Respects rate limits**
- ✅ **Handles large volumes**

### Monitoring
- ✅ **Complete audit trail**
- ✅ **Real-time status updates**
- ✅ **Error tracking and reporting**

## 🔍 Troubleshooting

### Common Issues

1. **No loans being fetched**
   - Check partner Mifos X credentials
   - Verify loan status in Mifos X
   - Check auto-disbursal configuration

2. **Loans not processing**
   - Verify disbursement limits
   - Check M-Pesa credentials
   - Review error messages in loan tracking

3. **Mifos X updates failing**
   - Check Mifos X API permissions
   - Verify loan activation commands
   - Review API response codes

### Debug Steps

1. **Test individual APIs**:
   ```bash
   node test-loan-polling-system.js
   ```

2. **Check loan tracking records**:
   ```sql
   SELECT * FROM loan_tracking ORDER BY created_at DESC LIMIT 10;
   ```

3. **Review disbursement records**:
   ```sql
   SELECT * FROM disbursement_requests WHERE origin = 'ui' ORDER BY created_at DESC LIMIT 10;
   ```

## 🚀 Next Steps

1. **Deploy the APIs** to Vercel
2. **Set up cron job** for automatic execution
3. **Test with real loans** in Mifos X
4. **Monitor the system** for a few days
5. **Move to Phase 3: SMS Integration**

---

**The loan polling system is now ready for deployment and testing!** 🎉
