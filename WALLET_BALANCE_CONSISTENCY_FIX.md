# Partner Wallet Balance Consistency Fix

## Overview
This document outlines the fixes applied to ensure partner wallet balance consistency across all wallet-related transaction tables.

## Issues Identified

### 1. **Inconsistent Balance Updates**
- The RPC function `update_partner_wallet_balance` was updating `partner_wallets.current_balance` but **not creating** `wallet_transactions` records
- This caused discrepancies where wallet balances didn't match the sum of wallet transactions
- Manual top-ups via `allocate` route were using incorrect field names (`transaction_amount` instead of `amount`, `msisdn` instead of `customer_phone`)

### 2. **Duplicate Transaction Records Risk**
- The `wallet-manager` edge function creates a `wallet_transactions` record initially, then calls the RPC function
- The old RPC function would create **another** `wallet_transactions` record, causing duplicates

### 3. **Missing Transaction Records**
- Some balance updates via RPC function didn't have corresponding `wallet_transactions` records
- This made it impossible to audit or verify balance changes

## Fixes Applied

### 1. Fixed Manual Top-Up Allocation (`app/api/c2b/transactions/[id]/allocate/route.ts`)
**Issue**: Using incorrect field names
- `transaction.transaction_amount` → `transaction.amount`
- `transaction.msisdn` → `transaction.customer_phone`

**Result**: Manual top-ups now correctly update partner wallet balances.

### 2. Enhanced RPC Function (`supabase/migrations/092_fix_wallet_balance_rpc_create_transactions.sql`)
**Changes**:
- Added optional parameters: `p_reference`, `p_description`, `p_metadata`
- Now creates `wallet_transactions` records for all balance updates
- Checks for existing transactions by reference to avoid duplicates
- Updates existing transactions if found, creates new ones if not
- Validates balance to prevent negative balances for charges/disbursements

**Backward Compatibility**: Existing calls with 3 parameters still work (parameters 4-6 are optional).

### 3. Updated Wallet Manager (`supabase/functions/wallet-manager/index.ts`)
**Changes**:
- Passes existing transaction reference to RPC function
- RPC function now updates existing transaction instead of creating duplicate
- Ensures proper metadata is preserved and updated

### 4. Created Verification Query (`scripts/verify_wallet_balance_consistency.sql`)
**Purpose**: Check balance consistency across all tables

**Queries Included**:
1. **Balance Consistency Check**: Compares `partner_wallets.current_balance` vs sum of `wallet_transactions.amount`
2. **Missing Wallet Transactions**: Finds C2B transactions with partner_id but no wallet_transactions record
3. **Suspicious Wallets**: Identifies wallets with balance but no transaction records
4. **Summary Statistics**: Overall balance totals and differences

## How to Verify Balance Consistency

Run the verification query:

```bash
# Using Supabase CLI
supabase db execute -f scripts/verify_wallet_balance_consistency.sql

# Or directly in your database
psql -d your_database -f scripts/verify_wallet_balance_consistency.sql
```

## Balance Update Flow (After Fixes)

### 1. NCBA Paybill Notifications
- ✅ Uses `UnifiedWalletService.updateWalletBalance()`
- ✅ Creates `wallet_transactions` record
- ✅ Updates `partner_wallets.current_balance`

### 2. Manual Top-Up Allocations
- ✅ Uses `UnifiedWalletService.updateWalletBalance()`
- ✅ Creates `wallet_transactions` record
- ✅ Updates `partner_wallets.current_balance`

### 3. Manual Admin Allocations
- ✅ Uses `UnifiedWalletService.updateWalletBalance()`
- ✅ Creates `wallet_transactions` record
- ✅ Updates `partner_wallets.current_balance`

### 4. STK Push Top-Ups (Wallet Manager)
- ✅ Creates initial `wallet_transactions` record (pending)
- ✅ Calls RPC function with existing transaction reference
- ✅ RPC function updates existing transaction (no duplicate)
- ✅ Updates `partner_wallets.current_balance`

### 5. Charge Deductions
- ✅ Uses `UnifiedWalletService.updateWalletBalance()`
- ✅ Creates `wallet_transactions` record
- ✅ Updates `partner_wallets.current_balance`

## Database Schema Consistency

### Tables Involved:
1. **`partner_wallets`**: Stores current balance
2. **`wallet_transactions`**: Audit trail of all balance changes
3. **`c2b_transactions`**: C2B payment records
4. **`partner_charge_transactions`**: Charge transaction records

### Consistency Rule:
```
partner_wallets.current_balance = SUM(wallet_transactions.amount WHERE status = 'completed')
```

## Migration Required

Run the new migration to update the RPC function:

```bash
supabase migration up
```

Or manually apply:

```sql
-- Run supabase/migrations/092_fix_wallet_balance_rpc_create_transactions.sql
```

## Testing Recommendations

1. **Test Manual Top-Up**: Allocate a C2B transaction and verify:
   - Wallet balance updates
   - `wallet_transactions` record created
   - Balance matches transaction amount

2. **Test NCBA Notification**: Process a paybill notification and verify:
   - Wallet balance updates
   - `wallet_transactions` record created
   - Balance matches transaction amount

3. **Test STK Push**: Complete an STK push and verify:
   - Initial `wallet_transactions` record updated (not duplicated)
   - Wallet balance updates
   - Balance matches transaction amount

4. **Run Verification Query**: Check for any inconsistencies:
   ```sql
   -- See scripts/verify_wallet_balance_consistency.sql
   ```

## Notes

- The RPC function is still used by the `wallet-manager` edge function for atomic balance updates
- All other routes use `UnifiedWalletService` which already creates transaction records
- The verification query should be run periodically to catch any inconsistencies
- If inconsistencies are found, they may need manual correction based on the audit trail

