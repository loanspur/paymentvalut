# Testing NCBA Open Banking on Localhost

## Quick Start

Since your localhost IP is already whitelisted by NCBA, you can test directly from your local machine.

### Step 1: Start the Development Server

```bash
# Make sure you're in the project directory
cd c:\Users\Admin\projects\paymentvalut

# Start the development server
npm run dev
```

The server will start on `http://localhost:3000`

### Step 2: Test Token Generation

Open your browser and go to `http://localhost:3000`, then open the browser console and run:

```javascript
fetch('/api/ncba/ob/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('Token Response:', data)
  if (data.success) {
    console.log('✅ Success! Token:', data.data)
  } else {
    console.error('❌ Error:', data.error)
    if (data.troubleshooting) {
      console.log('Troubleshooting:', data.troubleshooting)
    }
  }
})
.catch(error => {
  console.error('Fetch Error:', error)
})
```

### Step 3: Test Float Purchase Flow

#### A. Initiate Float Purchase

```javascript
fetch('/api/wallet/float/purchase', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({ amount: 1000 })
})
.then(r => r.json())
.then(data => {
  console.log('Float Purchase Initiated:', data)
  if (data.success) {
    console.log('OTP Reference:', data.data.otp_reference)
    console.log('Check console logs for OTP code')
    // The OTP will be logged in the server console (terminal)
  }
})
```

#### B. Check Server Console for OTP

The OTP code will be logged in your terminal where `npm run dev` is running. Look for:
```
OTP Generated for Float Purchase: { otp_code: '123456', ... }
```

#### C. Complete Float Purchase

```javascript
fetch('/api/wallet/float/purchase/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    otp_reference: 'FLOAT_...', // From previous response
    otp_code: '123456' // From server console
  })
})
.then(r => r.json())
.then(data => {
  console.log('Float Purchase Result:', data)
  if (data.success) {
    console.log('✅ Float purchase successful!')
    console.log('NCBA Response:', data.data.ncba_response)
  } else {
    console.error('❌ Error:', data.error)
  }
})
```

## Important Notes

### 1. Local IP Whitelisting
- ✅ Your localhost IP is already whitelisted
- ✅ NCBA will see requests coming from your local IP
- ✅ No changes needed for IP whitelisting

### 2. Environment Variables
Make sure your `.env.local` file has all required variables:

```bash
# NCBA Open Banking Settings (from system_settings table)
# These should be configured in the Settings page of your app

# Other required variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. NCBA Settings in Database
Ensure your NCBA Open Banking settings are configured in the database:

1. Go to `http://localhost:3000/settings`
2. Navigate to **NCBA Open Banking Settings** section
3. Verify UAT settings are configured:
   - Environment: `uat`
   - UAT Base URL: `https://openbankingtest.api.ncbagroup.com/test/apigateway/`
   - Token Path: `/api/v1/Token` (verify with NCBA)
   - Float Purchase Path: `/api/v1/FloatPurchase/floatpurchase` (verify with NCBA)
   - Subscription Key: Your UAT subscription key
   - Username: `NtbUATob254`
   - Password: Your UAT password
   - Debit Account Number: Your UAT debit account
   - Debit Account Currency: `KES`
   - Country: `Kenya`

### 4. Testing Flow

```
Browser (localhost:3000)
  ↓
Your Local Server (localhost:3000)
  ↓ (uses your local IP - whitelisted ✅)
NCBA Open Banking API (UAT)
```

## Troubleshooting

### Issue 1: Still Getting 403 Error
- **Check**: Is your local IP still whitelisted? (Contact NCBA to verify)
- **Check**: Are you using the correct UAT credentials?
- **Check**: Is the subscription key correct?

### Issue 2: Cannot Connect to NCBA
- **Check**: Your internet connection
- **Check**: Firewall isn't blocking outbound requests
- **Check**: NCBA UAT environment is accessible

### Issue 3: Authentication Error
- **Verify**: Username and password are correct
- **Verify**: Using `userID` not `username` (already fixed in code)
- **Verify**: Subscription key is correct

### Issue 4: OTP Not Appearing
- **Check**: Server console (terminal) for OTP logs
- **Check**: Database for `otp_validations` table
- **Note**: OTP is logged to console, not sent via SMS/Email yet

## Testing Checklist

- [ ] Development server running on `localhost:3000`
- [ ] NCBA Open Banking settings configured in database
- [ ] Token generation endpoint tested successfully
- [ ] Float purchase initiation tested
- [ ] OTP retrieved from server console
- [ ] Float purchase completion tested
- [ ] NCBA responses logged and reviewed

## Next Steps After Local Testing

Once localhost testing is successful:

1. **Get Production IP**: Find your production server IP (eazzypay.online)
2. **Whitelist Production IP**: Contact NCBA to whitelist production IP
3. **Test on Production**: Test the same endpoints on eazzypay.online
4. **Deploy**: Deploy your code changes to production

## Quick Test Commands

Copy and paste these in your browser console at `http://localhost:3000`:

```javascript
// Test 1: Token Generation
fetch('/api/ncba/ob/token', { method: 'POST', credentials: 'include' })
  .then(r => r.json())
  .then(console.log)

// Test 2: Float Purchase Initiate (after logging in)
fetch('/api/wallet/float/purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ amount: 1000 })
})
.then(r => r.json())
.then(console.log)

// Test 3: Float Purchase Confirm (after getting OTP from server console)
fetch('/api/wallet/float/purchase/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    otp_reference: 'FLOAT_...',
    otp_code: '123456'
  })
})
.then(r => r.json())
.then(console.log)
```

