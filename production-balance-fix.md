# Production Account Balance API Fix

## Current Status
- **B2C API (Disbursement)**: ✅ Working with `LSVaultFSAPI`, `LSVaultAPI`
- **Account Balance API**: ❌ Failing with "Invalid Initiator" error

## Key Differences to Investigate

### 1. **API Endpoints**
- B2C: `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`
- Balance: `https://api.safaricom.co.ke/mpesa/accountbalance/v1/query`

### 2. **Command IDs**
- B2C: `"BusinessPayment"`
- Balance: `"AccountBalance"`

### 3. **Request Structure**
- B2C: Requires `Amount`, `PartyB`, `Occasion`
- Balance: Requires `IdentifierType`, different callback structure

## Possible Solutions

### Option 1: Check API Registration
The Account Balance API might require separate registration in M-Pesa portal.

### Option 2: Different Initiator Names
Some APIs require different initiator names even for the same account.

### Option 3: Request Format Issues
The Account Balance API might have stricter validation.

### Option 4: Environment Variables
Missing or incorrect environment variables for Account Balance API.

