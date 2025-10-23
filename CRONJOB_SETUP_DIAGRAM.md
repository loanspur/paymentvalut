# 📊 Cron-Job.org Setup Diagram

## 🔄 Loan Polling Flow

```
┌─────────────────┐    Every 10 min    ┌──────────────────┐
│   Cron-Job.org  │ ──────────────────► │  Supabase Edge   │
│                 │                     │   Function       │
│ Schedule:       │                     │  loan-polling    │
│ */10 * * * *    │                     │                  │
└─────────────────┘                     └──────────────────┘
         │                                        │
         │ POST Request                           │
         │ Headers:                               │
         │ - Authorization: Bearer TOKEN          │
         │ - Content-Type: application/json       │
         │ - x-api-key: TOKEN                     │
         │ Body: {}                               │
         │                                        │
         │                                        ▼
         │                              ┌──────────────────┐
         │                              │   Fetch Active   │
         │                              │    Partners      │
         │                              │                  │
         │                              └──────────────────┘
         │                                        │
         │                                        ▼
         │                              ┌──────────────────┐
         │                              │  For Each Partner│
         │                              │                  │
         │                              │ 1. Umoja Magharibi│
         │                              └──────────────────┘
         │                                        │
         │                                        ▼
         │                              ┌──────────────────┐
         │                              │  Call Mifos X API│
         │                              │                  │
         │                              │ GET /loans       │
         │                              │ status=200       │
         │                              └──────────────────┘
         │                                        │
         │                                        ▼
         │                              ┌──────────────────┐
         │                              │  Process Loans   │
         │                              │                  │
         │                              │ • Create tracking│
         │                              │ • Check auto-disb│
         │                              │ • Trigger disburs│
         │                              └──────────────────┘
         │                                        │
         │                                        ▼
         │                              ┌──────────────────┐
         │                              │  Update Database │
         │                              │                  │
         │                              │ • loan_tracking  │
         │                              │ • disbursements  │
         │                              │ • wallet_trans   │
         │                              └──────────────────┘
         │                                        │
         │                                        ▼
         │                              ┌──────────────────┐
         │                              │  Return Results  │
         │                              │                  │
         │                              │ {                │
         │                              │   "success": true│
         │                              │   "partners": 1  │
         │                              │   "loans": 100   │
         │                              │ }                │
         │                              └──────────────────┘
         │                                        │
         │                                        │
         └────────────────────────────────────────┘
```

## 📋 Configuration Summary

### Cron-Job.org Settings:
```
Title: Payment Vault - Loan Polling
URL: https://mapgmmiobityxaaevomp.supabase.co/functions/v1/loan-polling
Schedule: */10 * * * *
Method: POST
Timeout: 60 seconds
```

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Body:
```json
{}
```

## 🎯 Expected Results

### Every 10 Minutes:
1. **Cron-Job.org** triggers the Edge Function
2. **Edge Function** fetches active partners
3. **Mifos X API** called for each partner
4. **New loans** discovered and tracked
5. **Auto-disbursements** triggered if configured
6. **Database** updated with results

### Success Response:
```json
{
  "success": true,
  "partners_checked": 1,
  "loans_found": 100,
  "loans_processed": 0,
  "results": [...]
}
```

## 🔧 Troubleshooting Flow

```
┌─────────────────┐
│   Test Run      │
│   Fails?        │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Check Headers   │
│ Authorization   │
│ Content-Type    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Check URL       │
│ Correct?        │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Check Timeout   │
│ 60+ seconds?    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Check Edge      │
│ Function Logs   │
└─────────────────┘
```

## 📊 Monitoring Points

### 1. Cron-Job.org Dashboard
- Execution history
- Success/failure rates
- Response times
- Error messages

### 2. Supabase Edge Function Logs
- Detailed execution logs
- Partner processing status
- Loan discovery results
- Error details

### 3. Database Tables
- `loan_tracking`: New loan records
- `disbursement_requests`: Auto-disbursements
- `wallet_transactions`: Charge deductions

## 🎉 Success Indicators

✅ **Cron Job**: Executes every 10 minutes
✅ **Edge Function**: Returns 200 OK
✅ **Partners**: Processed successfully
✅ **Loans**: Discovered and tracked
✅ **Database**: Updated with new records
✅ **Monitoring**: No errors in logs

---

## 🚀 Ready to Configure!

Follow the step-by-step guide to set up your cron job at cron-job.org. The system will then automatically poll for loans every 10 minutes! 🎉

