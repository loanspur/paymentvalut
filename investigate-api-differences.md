# M-Pesa API Differences Investigation

## The Issue
- **Disbursement (B2C API)** works with initiator names: `LSVaultFSAPI`, `LSVaultAPI`
- **Balance Check (Account Balance API)** fails with same initiator names: "Invalid Initiator"

## Possible Causes

### 1. **Different API Permissions**
- B2C API and Account Balance API might require different permissions
- The initiator might be registered for B2C but not for Account Balance

### 2. **Different API Endpoints**
- B2C API: `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`
- Account Balance API: `https://api.safaricom.co.ke/mpesa/accountbalance/v1/query`

### 3. **Different Command IDs**
- B2C API uses: `"BusinessPayment"`
- Account Balance API uses: `"AccountBalance"`

### 4. **Environment Differences**
- Both are using production environment
- But Account Balance API might have stricter validation

## Next Steps

1. **Check what initiator name is actually being sent**
2. **Compare with a working disbursement request**
3. **Check if Account Balance API requires different registration**
4. **Try using sandbox environment for testing**

## Potential Solutions

1. **Use different initiator names for Account Balance API**
2. **Check M-Pesa account permissions for Account Balance API**
3. **Contact Safaricom to verify Account Balance API access**
4. **Try using sandbox environment first**

