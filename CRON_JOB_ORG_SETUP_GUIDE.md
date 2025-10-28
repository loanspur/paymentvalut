# Cron-Job.org Setup Guide for Payment Vault

## Overview
This guide explains how to migrate from GitHub Actions cron jobs to cron-job.org for better reliability and monitoring of Payment Vault's transaction monitoring system.

## Current Cron Jobs to Migrate

### 1. Loan Polling (Every 10 minutes)
- **Current**: GitHub Actions workflow
- **New**: cron-job.org scheduled job
- **Endpoint**: `https://eazzypay.online/api/cron/loan-polling`
- **Purpose**: Polls Mifos X for approved loans and triggers auto-disbursement

### 2. Disbursement Retry (Every 5 minutes)
- **Current**: GitHub Actions workflow  
- **New**: cron-job.org scheduled job
- **Endpoint**: `https://eazzypay.online/api/cron/disburse-retry`
- **Purpose**: Retries failed disbursement requests

### 3. Transaction Monitoring (Every 15 minutes)
- **New**: cron-job.org scheduled job
- **Endpoint**: `https://eazzypay.online/api/cron/transaction-monitoring`
- **Purpose**: Monitors transaction health and generates alerts

### 4. Balance Monitoring (Every 30 minutes)
- **New**: cron-job.org scheduled job
- **Endpoint**: `https://eazzypay.online/api/cron/balance-monitoring`
- **Purpose**: Monitors partner wallet balances and alerts for low balances

## Cron-Job.org Setup Instructions

### Step 1: Create Account
1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Verify your email address

### Step 2: Configure Environment Variables
Add the following environment variable to your Vercel deployment:
```
CRON_SECRET=your-secure-random-string-here
```

### Step 3: Create Cron Jobs

#### Job 1: Loan Polling
- **Title**: Payment Vault - Loan Polling
- **URL**: `https://eazzypay.online/api/cron/loan-polling`
- **Schedule**: `*/10 * * * *` (Every 10 minutes)
- **Method**: GET
- **Headers**: 
  - `Authorization: Bearer your-secure-random-string-here`
- **Timeout**: 300 seconds
- **Expected Response**: 200 OK with JSON success response

#### Job 2: Disbursement Retry
- **Title**: Payment Vault - Disbursement Retry
- **URL**: `https://eazzypay.online/api/cron/disburse-retry`
- **Schedule**: `*/5 * * * *` (Every 5 minutes)
- **Method**: GET
- **Headers**: 
  - `Authorization: Bearer your-secure-random-string-here`
- **Timeout**: 300 seconds
- **Expected Response**: 200 OK with JSON success response

#### Job 3: Transaction Monitoring
- **Title**: Payment Vault - Transaction Monitoring
- **URL**: `https://eazzypay.online/api/cron/transaction-monitoring`
- **Schedule**: `*/15 * * * *` (Every 15 minutes)
- **Method**: GET
- **Headers**: 
  - `Authorization: Bearer your-secure-random-string-here`
- **Timeout**: 180 seconds
- **Expected Response**: 200 OK with JSON success response

#### Job 4: Balance Monitoring
- **Title**: Payment Vault - Balance Monitoring
- **URL**: `https://eazzypay.online/api/cron/balance-monitoring`
- **Schedule**: `*/30 * * * *` (Every 30 minutes)
- **Method**: GET
- **Headers**: 
  - `Authorization: Bearer your-secure-random-string-here`
- **Timeout**: 180 seconds
- **Expected Response**: 200 OK with JSON success response

### Step 4: Configure Notifications
Set up email notifications for:
- Job failures
- Consecutive failures (2+ in a row)
- Response timeouts
- Unexpected response codes

### Step 5: Test Cron Jobs
1. Use the "Test Now" feature for each job
2. Verify responses in the cron-job.org dashboard
3. Check logs for successful execution

## API Endpoints Documentation

### Loan Polling Endpoint
**GET/POST** `/api/cron/loan-polling`

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Loan polling process completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "result": {
    "partners_checked": 3,
    "loans_found": 5,
    "loans_processed": 2,
    "results": [...]
  }
}
```

### Disbursement Retry Endpoint
**GET/POST** `/api/cron/disburse-retry`

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Automatic retry process completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "result": {
    "retry_count": 3,
    "success_count": 2,
    "failure_count": 1,
    "processed": [...]
  }
}
```

### Transaction Monitoring Endpoint
**GET/POST** `/api/cron/transaction-monitoring`

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction monitoring completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "today_transactions": 150,
    "today_amount": 250000,
    "failed_transactions": 5,
    "pending_transactions": 12,
    "system_health": {
      "failed_rate": "3.33",
      "pending_rate": "8.00",
      "success_rate": "88.67"
    }
  }
}
```

### Balance Monitoring Endpoint
**GET/POST** `/api/cron/balance-monitoring`

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Balance monitoring completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "partners_monitored": 10,
    "total_system_balance": 5000000,
    "low_balance_alerts": 2,
    "balance_alerts": [...]
  }
}
```

## Migration Steps

### 1. Deploy New Endpoints
- Deploy the new cron endpoints to production
- Set up the `CRON_SECRET` environment variable

### 2. Create Cron-Job.org Jobs
- Create all 4 cron jobs as described above
- Test each job individually

### 3. Monitor for 24 Hours
- Let both systems run in parallel
- Compare results between GitHub Actions and cron-job.org
- Verify all jobs are executing correctly

### 4. Disable GitHub Actions
- Once confirmed working, disable the GitHub Actions workflows:
  - `.github/workflows/loan-polling.yml`
  - `.github/workflows/disburse-retry.yml`

### 5. Clean Up
- Remove the GitHub Actions workflow files
- Update documentation to reflect new cron setup

## Benefits of Cron-Job.org

### Reliability
- ✅ 99.9% uptime guarantee
- ✅ Multiple server locations
- ✅ Automatic failover
- ✅ No dependency on GitHub Actions limits

### Monitoring
- ✅ Real-time job status
- ✅ Detailed execution logs
- ✅ Email/SMS notifications
- ✅ Response time monitoring
- ✅ Success/failure tracking

### Flexibility
- ✅ Easy schedule modification
- ✅ Manual job triggering
- ✅ Pause/resume functionality
- ✅ Multiple notification methods

## Troubleshooting

### Common Issues

#### 401 Unauthorized
- Check that `CRON_SECRET` is set correctly in Vercel
- Verify the Authorization header matches exactly

#### 500 Internal Server Error
- Check Supabase Edge Function logs
- Verify environment variables are set
- Check database connectivity

#### Timeout Errors
- Increase timeout in cron-job.org settings
- Check if Edge Functions are taking too long
- Monitor Supabase function execution time

### Monitoring Commands

```bash
# Check cron job status
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://eazzypay.online/api/cron/loan-polling

# Test transaction monitoring
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://eazzypay.online/api/cron/transaction-monitoring
```

## Security Considerations

1. **CRON_SECRET**: Use a strong, random string (32+ characters)
2. **HTTPS Only**: All endpoints use HTTPS
3. **Authorization**: All endpoints require Bearer token
4. **Rate Limiting**: Consider implementing rate limiting
5. **Logging**: All requests are logged for audit purposes

## Cost Considerations

- **cron-job.org Free Plan**: 5 jobs, 1-minute intervals
- **cron-job.org Pro Plan**: $3/month for unlimited jobs
- **Benefits**: More reliable than GitHub Actions free tier
- **ROI**: Prevents transaction processing delays

## Support

For issues with:
- **cron-job.org**: Contact their support team
- **Payment Vault**: Check application logs and Supabase Edge Function logs
- **API Endpoints**: Verify environment variables and database connectivity
