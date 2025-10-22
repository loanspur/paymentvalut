# Safaricom API Call Analysis

## 🔍 **Current Implementation Analysis**

Based on the code investigation, here's exactly what's happening with the Safaricom API calls:

### **1. Credentials Being Used**

The system uses the `CredentialManager` to retrieve credentials in this order:

1. **Encrypted Credentials** (from `partners.encrypted_credentials`)
2. **Plain Text Credentials** (from `partners` table columns)
3. **Shared Credentials** (from `shared_mpesa_credentials` table)

**Credential Fields Required:**
- `consumer_key` - M-Pesa Consumer Key
- `consumer_secret` - M-Pesa Consumer Secret  
- `initiator_password` - Initiator Password
- `security_credential` - Security Credential (encrypted initiator password)
- `initiator_name` - Initiator Name

### **2. API Request Format**

The system makes requests to Safaricom's Account Balance API with this exact format:

```json
{
  "Initiator": "credentials.initiator_name || 'default_initiator'",
  "SecurityCredential": "credentials.security_credential",
  "CommandID": "AccountBalance",
  "PartyA": "partner.mpesa_shortcode",
  "IdentifierType": "4",
  "Remarks": "balance inquiry",
  "QueueTimeOutURL": "https://your-project.supabase.co/functions/v1/mpesa-balance-result",
  "ResultURL": "https://your-project.supabase.co/functions/v1/mpesa-balance-result"
}
```

### **3. API Endpoints Used**

**Authentication:**
- **Production**: `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
- **Sandbox**: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

**Balance Check:**
- **Production**: `https://api.safaricom.co.ke/mpesa/accountbalance/v1/query`
- **Sandbox**: `https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query`

### **4. Callback URLs**

The system uses these callback URLs:
- **QueueTimeOutURL**: `{NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mpesa-balance-result`
- **ResultURL**: `{NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mpesa-balance-result`

### **5. Callback Processing**

The `mpesa-balance-result` function processes callbacks and extracts:
- `AccountBalance` → `balance_after`
- `B2CUtilityAccountAvailableFunds` → `utility_account_balance`
- `B2CWorkingAccountAvailableFunds` → `working_account_balance`
- `B2CChargesAccountAvailableFunds` → `charges_account_balance`

## 🚨 **Potential Issues Identified**

### **Issue 1: Missing or Incorrect Credentials**
- Partners may not have proper credentials stored
- Encrypted credentials may not be decrypting properly
- Security credential may be missing or incorrect

### **Issue 2: Wrong Environment Configuration**
- Partners may be configured for wrong environment (sandbox vs production)
- API URLs may not match the environment

### **Issue 3: Callback URL Issues**
- `NEXT_PUBLIC_SUPABASE_URL` may not be set correctly
- Callback URLs may not be accessible from Safaricom's servers
- Edge function may not be deployed or accessible

### **Issue 4: API Request Format Issues**
- `Initiator` name may be incorrect
- `SecurityCredential` may not be properly encrypted
- `PartyA` (shortcode) may be wrong
- `IdentifierType` should be "4" for organization

### **Issue 5: Authentication Issues**
- Consumer key/secret may be incorrect
- OAuth token generation may be failing
- Token may be expired or invalid

## 🔧 **Debugging Steps**

### **Step 1: Check Credentials**
Run the SQL investigation script to see what credentials are actually stored.

### **Step 2: Verify Environment Variables**
Check that `NEXT_PUBLIC_SUPABASE_URL` and `MPESA_VAULT_PASSPHRASE` are set correctly.

### **Step 3: Test API Endpoints**
Verify that the callback URLs are accessible and the edge functions are deployed.

### **Step 4: Check API Request Format**
Ensure the request format matches Safaricom's requirements exactly.

### **Step 5: Monitor Callbacks**
Check if Safaricom is actually calling back to the result URLs.

## 📊 **Expected vs Actual Behavior**

**Expected:**
1. System gets OAuth token from Safaricom
2. Makes balance check request with proper credentials
3. Safaricom processes request and calls back with balance data
4. System updates database with balance information
5. Frontend displays fresh balance data

**Actual (Based on Investigation):**
1. System may not be getting proper credentials
2. API requests may be failing due to credential issues
3. Callbacks may not be received due to URL issues
4. Balance data remains stale or shows "No Data"

## 🎯 **Next Steps**

1. **Run the investigation SQL script** to see current credential status
2. **Check environment variables** in Supabase
3. **Verify edge function deployment** and accessibility
4. **Test API endpoints** manually if needed
5. **Fix credential issues** based on investigation results

The root cause is likely in the credential management or callback URL configuration!

