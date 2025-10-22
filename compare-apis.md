# M-Pesa API Comparison

## Working API (Disbursement - B2C)
- **Endpoint**: `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`
- **CommandID**: `"BusinessPayment"`
- **Initiator Names**: `LSVaultFSAPI`, `LSVaultAPI` ✅ WORKING

## Failing API (Balance Check - Account Balance)
- **Endpoint**: `https://api.safaricom.co.ke/mpesa/accountbalance/v1/query`
- **CommandID**: `"AccountBalance"`
- **Initiator Names**: `LSVaultFSAPI`, `LSVaultAPI` ❌ FAILING

## Possible Issues

### 1. **Different API Permissions**
The Account Balance API might require different permissions or registration than B2C API.

### 2. **Different Initiator Registration**
The initiator might be registered for B2C operations but not for Account Balance operations.

### 3. **API-Specific Requirements**
Account Balance API might have stricter validation or different requirements.

## Solutions to Try

### Option 1: Use Sandbox Environment
Test with sandbox first to see if it's a production permission issue.

### Option 2: Check M-Pesa Account Dashboard
Verify that Account Balance API access is enabled for these initiators.

### Option 3: Try Different Initiator Names
Some APIs might require different initiator names even for the same account.

### Option 4: Contact Safaricom Support
Ask about Account Balance API access requirements.

