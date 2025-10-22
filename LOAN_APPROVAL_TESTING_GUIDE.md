# Loan Approval Testing Guide

## 🧪 Testing the Loan Trigger After Approval

Now that your loan product configuration is working, here's how to test the complete loan approval and disbursement flow:

## 📋 Prerequisites

1. **Database Setup**: Run the loan tracking table creation script
2. **Partner Configuration**: Ensure your partner has Mifos X configured and loan products set up
3. **Auto-disbursal Configuration**: Configure at least one loan product for auto-disbursal

## 🗄️ Step 1: Create the Loan Tracking Table

Run this SQL script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of create-loan-tracking-table.sql
```

## 🧪 Step 2: Test the Webhook Endpoint

### Option A: Use the Test Script (Recommended)

1. **Update the webhook URL** in `test-loan-approval-webhook.js`:
   ```javascript
   const webhookUrl = 'http://localhost:3000/api/mifos/webhook/loan-approval';
   // OR for production:
   // const webhookUrl = 'https://your-domain.vercel.app/api/mifos/webhook/loan-approval';
   ```

2. **Run the test script**:
   ```bash
   node test-loan-approval-webhook.js
   ```

### Option B: Use Postman/curl

```bash
curl -X POST http://localhost:3000/api/mifos/webhook/loan-approval \
  -H "Content-Type: application/json" \
  -d '{
    "officeId": 1,
    "clientId": 1,
    "loanId": 12345,
    "resourceId": 12345,
    "changes": {
      "status": {
        "id": 300,
        "code": "loanStatusType.approved",
        "value": "Approved",
        "pendingApproval": false,
        "waitingForDisbursal": true,
        "active": false,
        "closedObligationsMet": false,
        "closedWrittenOff": false,
        "closedRescheduled": false,
        "closed": false,
        "overpaid": false
      },
      "locale": "en",
      "dateFormat": "dd MMMM yyyy",
      "approvedOnDate": "22 October 2025",
      "expectedDisbursementDate": "23 October 2025"
    }
  }'
```

## 📊 Step 3: Monitor the Results

### Check the Loan Tracking Dashboard

1. **Navigate to the Loan Tracking page**:
   - Go to your application
   - Click on "Loan Tracking" in the sidebar (under Management section)

2. **View the results**:
   - You should see the test loan record
   - Status will show "Pending Disbursement" initially
   - If disbursement succeeds, status will change to "Disbursed"
   - If disbursement fails, status will show "Failed"

### Check the Database

Query the loan tracking table:

```sql
SELECT 
  lt.*,
  p.name as partner_name
FROM loan_tracking lt
JOIN partners p ON lt.partner_id = p.id
ORDER BY lt.created_at DESC;
```

### Check the Console Logs

Look for these log messages:

```
[Mifos Webhook] Received loan approval webhook
[Mifos Webhook] Processing for partner: [Partner Name]
[Mifos Webhook] Created disbursement record: [ID]
[Mifos Webhook] Created loan tracking record: [ID]
[Mifos Webhook] Disbursement successful: [Transaction ID]
```

## 🔍 Expected Flow

1. **Webhook Received**: Loan approval webhook is received
2. **Partner Lookup**: System finds the partner with Mifos X configuration
3. **Loan Details**: Fetches loan and client details from Mifos X API
4. **Auto-disbursal Check**: Verifies the loan product has auto-disbursal enabled
5. **Amount Validation**: Checks if loan amount is within configured limits
6. **Disbursement Creation**: Creates disbursement record
7. **Loan Tracking**: Creates loan tracking record
8. **M-Pesa Disbursement**: Triggers actual M-Pesa B2C disbursement
9. **Status Updates**: Updates both disbursement and tracking records

## 🚨 Troubleshooting

### Common Issues

1. **"No partner found with Mifos X configuration"**
   - Ensure your partner has `is_mifos_configured = true`
   - Check that Mifos X credentials are properly saved

2. **"No auto-disbursal configuration found"**
   - Go to Partners → Edit Partner → Mifos X Configuration
   - Click "Fetch Loan Products" and configure auto-disbursal for at least one product

3. **"Loan amount outside auto-disbursal limits"**
   - Check the min/max amount settings for the loan product
   - Adjust the limits in the loan product configuration

4. **"Failed to fetch loan details from Mifos X"**
   - Verify Mifos X credentials are correct
   - Check that the loan ID exists in your Mifos X system
   - Ensure the API endpoint is accessible

### Debug Steps

1. **Check webhook logs** in your application console
2. **Verify database records** in the loan_tracking table
3. **Test Mifos X connection** using the "Test Connection" button
4. **Check disbursement records** in the disbursement_requests table

## 🎯 Success Criteria

✅ **Webhook receives and processes the loan approval**  
✅ **Loan tracking record is created**  
✅ **Disbursement record is created**  
✅ **M-Pesa disbursement is triggered**  
✅ **Status updates are reflected in the dashboard**  
✅ **M-Pesa receipt number is captured**  

## 🔄 Next Steps

Once testing is successful:

1. **Configure webhook URL in Mifos X**:
   - Set the webhook URL to your deployed endpoint
   - Configure the webhook to trigger on loan approval

2. **Set up monitoring**:
   - Use the Loan Tracking dashboard to monitor real loan approvals
   - Set up alerts for failed disbursements

3. **Production deployment**:
   - Deploy the updated webhook handler
   - Test with real loan approvals from Mifos X

## 📞 Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify all database tables exist and have proper data
3. Test the Mifos X connection independently
4. Check that M-Pesa credentials are properly configured

The system is now ready to handle real loan approvals from Mifos X! 🎉
