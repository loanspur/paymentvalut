# Testing NCBA Float Purchase Integration

This guide helps you test the NCBA Open Banking float purchase integration using UAT/sandbox credentials on eazzypay.com.

## Prerequisites

1. **NCBA UAT Settings Configured**
   - Ensure all NCBA Open Banking settings are configured in the system
   - Environment should be set to `uat`
   - Your IP address must be whitelisted by NCBA

2. **B2C Account Number**
   - Your M-Pesa B2C account number: **4120187**
   - This is automatically used in all float purchase requests

3. **Test Credentials**
   - Use the UAT credentials provided by NCBA
   - Username: `NtbUATob254`
   - Password: (from your settings)
   - Subscription Key: (from your settings)

## Testing Steps

### Step 1: Verify NCBA Settings

1. Navigate to **Settings** page on eazzypay.com
2. Go to **NCBA Open Banking Settings** section
3. Verify UAT environment settings:
   - Environment: `uat`
   - UAT Base URL: `https://openbankingtest.api.ncbagroup.com/test/apigateway/`
   - Token Path: `/api/v1/Token` (verify with NCBA)
   - Float Purchase Path: `/api/v1/FloatPurchase/floatpurchase` (verify with NCBA)
   - Subscription Key: Your UAT subscription key
   - Username: Your UAT username
   - Password: Your UAT password
   - Debit Account Number: Your UAT debit account
   - Debit Account Currency: `KES`
   - Country: `Kenya`

### Step 2: Test Token Generation

First, test if token generation works:

**Via Browser Console (on eazzypay.com):**
```javascript
fetch('/api/ncba/ob/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Token Response:', data))
.catch(e => console.error('Error:', e))
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

### Step 3: Test Float Purchase via UI

1. **Login** to eazzypay.com with a user account that has:
   - A partner assigned
   - Sufficient wallet balance
   - Verified email and phone number

2. **Navigate to Wallet Page**
   - Go to **Wallet** section

3. **Initiate Float Purchase**
   - Click **"Purchase B2C Float"** button
   - Enter a test amount (e.g., `1000` KES)
   - Review B2C Account Details:
     - **B2C Account**: 4120187
     - Partner name and short code
   - Review OTP delivery contacts (masked)
   - Click **"Purchase Float"**

4. **OTP Validation**
   - You should receive an OTP (check console logs or email/SMS)
   - Note the OTP code and reference
   - Use the confirm endpoint to complete the purchase

### Step 4: Complete Float Purchase with OTP

After receiving the OTP, complete the purchase:

**Via Browser Console:**
```javascript
fetch('/api/wallet/float/purchase/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    otp_reference: 'FLOAT_...', // From previous response
    otp_code: '123456' // The OTP you received
  })
})
.then(r => r.json())
.then(data => {
  console.log('Float Purchase Result:', data)
  if (data.success) {
    console.log('✅ Float purchase successful!')
    console.log('NCBA Response:', data.data.ncba_response)
  } else {
    console.error('❌ Float purchase failed:', data.error)
  }
})
.catch(e => console.error('Error:', e))
```

### Step 5: Direct NCBA API Test

If you want to test the NCBA API directly (bypassing the UI):

**Test Float Purchase Endpoint:**
```javascript
fetch('/api/ncba/ob/float-purchase', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    amount: 1000,
    customerRef: 'TEST_FLOAT_001',
    mobileNumber: '254712345678',
    agentName: 'Test Agent',
    payBillTillNo: '4120187', // Your B2C account
    paymentDescription: 'Test B2C Float Purchase',
    paymentType: 'FloatPurchase',
    toAccountName: 'Test B2C Account',
    transactionDate: '20241201' // YYYYMMDD format
  })
})
.then(r => r.json())
.then(data => {
  console.log('NCBA Float Purchase Response:', data)
})
.catch(e => console.error('Error:', e))
```

## Expected NCBA Request Payload

The system sends the following payload to NCBA:

```json
{
  "reqAgentName": "Your Name",
  "reqCreditAmount": "1000",
  "reqCustomerReference": "FLOAT_PARTNER123_1234567890",
  "reqDealReference": "FLOAT_...",
  "reqDebitAccountNumber": "YOUR_DEBIT_ACCT",
  "reqDebitAcCurrency": "KES",
  "reqDebitAmount": "1000",
  "reqMobileNumber": "254712345678",
  "reqPayBillTillNo": "4120187",
  "reqPaymentDescription": "B2C Float Purchase for Partner Name",
  "reqPaymentType": "FloatPurchase",
  "reqToAccountName": "Partner Name",
  "reqTransactionReferenceNo": "FLOAT_...",
  "reqTxnDate": "20241201",
  "senderCountry": "Kenya"
}
```

## Troubleshooting

### Error: "NCBA OB settings missing"
- Check that all required settings are configured in the database
- Verify settings in the Settings page

### Error: "Request timeout"
- Check if your server IP is whitelisted by NCBA
- Verify network connectivity to NCBA UAT environment

### Error: "Invalid credentials"
- Verify username and password are correct
- Check if credentials are encrypted/decrypted correctly

### Error: "No access token in response"
- Check NCBA token endpoint response format
- Verify token path is correct
- Check subscription key

### Error: "Failed to fetch SMS balance"
- This is unrelated to float purchase but check SMS credentials if OTP sending fails

## Monitoring

After successful float purchase:

1. **Check Wallet Balance**
   - Navigate to Wallet page
   - Verify balance was deducted correctly

2. **Check Transaction History**
   - Go to Transaction History
   - Look for `b2c_float_purchase` transaction
   - Status should be `completed`
   - Check metadata for NCBA response details

3. **Check OTP Validations**
   - OTP status should be `validated`
   - Check `otp_validations` table in database

4. **Check NCBA Response**
   - Transaction metadata contains full NCBA API response
   - Review for any warnings or additional information

## Next Steps

Once testing is successful:

1. Test with different amounts
2. Test error scenarios (insufficient balance, invalid OTP, etc.)
3. Monitor NCBA responses for any patterns
4. Test in production environment (with production credentials)

## Support

If you encounter issues:

1. Check browser console for errors
2. Check server logs for detailed error messages
3. Verify NCBA UAT Postman collection matches your API calls
4. Contact NCBA support with transaction references if needed

