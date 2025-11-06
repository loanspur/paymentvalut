# Wallet Balance Repair Guide

## Critical Issue Identified

Your database shows a **massive balance discrepancy**:
- **Stored Balance**: 4,958,650.00 KES
- **Calculated Balance**: -190.00 KES  
- **Difference**: 4,958,840.00 KES

This indicates that most wallet balance updates happened **without creating corresponding `wallet_transactions` records**.

## Root Cause

The old RPC function `update_partner_wallet_balance` and other direct balance updates were modifying `partner_wallets.current_balance` but not creating audit trail records in `wallet_transactions`. This happened before the fixes were applied.

## Repair Strategy

### Step 1: Diagnose the Issue

Run the diagnostic queries to understand the scope:

```bash
supabase db execute -f scripts/diagnose_wallet_balance_issues.sql
```

This will show you:
- How many wallets have balance but no transactions
- Which C2B transactions are missing wallet_transactions
- The distribution of transaction types
- Wallets with largest discrepancies

### Step 2: Safe Repair (Recommended First)

Start with the safe repair that only creates transactions for known C2B transactions:

```bash
supabase db execute -f scripts/repair_wallet_balances_safe.sql
```

This creates `wallet_transactions` records for:
- Completed C2B transactions that have `partner_id` but no `wallet_transactions` record

**Why this is safe**: We have the source data (C2B transactions) to create accurate transaction records.

### Step 3: Verify After Safe Repair

Run the verification query again:

```bash
supabase db execute -f scripts/verify_wallet_balance_consistency.sql
```

Check if the discrepancy is reduced. If there's still a significant difference, proceed to Step 4.

### Step 4: Full Repair (Use with Caution)

If there are still wallets with balance but no transactions after Step 2, you can run the full repair:

```bash
# BACKUP YOUR DATABASE FIRST!
supabase db execute -f scripts/repair_wallet_balances.sql
```

This will:
1. Create transactions for C2B transactions (same as safe repair)
2. Create "initial balance" transactions for wallets with balance but no transactions

**Warning**: The "initial balance" transactions are reconstructions - they represent the balance that existed before proper tracking, but may not reflect the actual transaction history.

### Step 5: Final Verification

After repairs, verify consistency:

```sql
-- Check if balances are now consistent
WITH wallet_balance_calc AS (
    SELECT 
        pw.id AS wallet_id,
        pw.partner_id,
        pw.current_balance AS stored_balance,
        COALESCE(SUM(wt.amount), 0) AS calculated_balance,
        pw.current_balance - COALESCE(SUM(wt.amount), 0) AS balance_difference
    FROM partner_wallets pw
    LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id AND wt.status = 'completed'
    GROUP BY pw.id, pw.partner_id, pw.current_balance
)
SELECT 
    COUNT(*) AS total_wallets,
    COUNT(CASE WHEN ABS(balance_difference) > 0.01 THEN 1 END) AS inconsistent_wallets,
    SUM(stored_balance) AS total_stored_balance,
    SUM(calculated_balance) AS total_calculated_balance,
    SUM(balance_difference) AS total_difference
FROM wallet_balance_calc;
```

## What the Repair Scripts Do

### Safe Repair (`repair_wallet_balances_safe.sql`)
- Creates `wallet_transactions` records for C2B transactions that are missing them
- Uses actual C2B transaction data (amount, customer, date, etc.)
- **No risk** - only creates records for known transactions

### Full Repair (`repair_wallet_balances.sql`)
- Does everything the safe repair does
- PLUS: Creates "initial balance" transactions for wallets with balance but no transactions
- These initial balance transactions are marked with `repair_action: 'initial_balance_reconciliation'`
- **Risk**: These are reconstructed transactions, not actual historical records

## Important Notes

1. **Backup First**: Always backup your database before running repair scripts
2. **Test Environment**: If possible, test the repair scripts on a copy of your database first
3. **Transaction History**: The repair creates transactions that represent missing balance changes, but they may not perfectly match the original transaction flow
4. **Future Prevention**: The fixes we've applied (RPC function update, UnifiedWalletService) will prevent this issue going forward

## After Repair

Once balances are consistent:
1. The new RPC function will create transactions for all future balance updates
2. All routes using `UnifiedWalletService` already create transactions
3. The verification query can be run periodically to catch any new inconsistencies

## Alternative Approach (If Repair is Too Risky)

If you're concerned about creating reconstructed transactions, you could:

1. Accept the current state for historical data
2. Ensure all new transactions use the fixed code
3. Create a "reconciliation" transaction for each wallet that represents the difference
4. Document that balances before a certain date may not have complete transaction history

This approach is safer but means you won't have a complete audit trail for historical balances.

## Questions to Consider

Before running the full repair, ask yourself:

1. **Do you need complete transaction history?** 
   - If yes, run the repair
   - If no, you can just ensure future transactions are tracked

2. **Are the C2B transactions the main source of balance?**
   - If yes, the safe repair should fix most issues
   - If no, you may need the full repair

3. **Can you verify the repair results?**
   - Check a few wallets manually to ensure the repair makes sense
   - Compare before/after transaction counts

## Recommended Approach

1. ✅ Run diagnostic queries to understand scope
2. ✅ Run safe repair (C2B transactions only)
3. ✅ Verify results
4. ⚠️ If still inconsistent, review diagnostic results carefully
5. ⚠️ Consider full repair only if necessary and after thorough review
6. ✅ Ensure all future code uses the fixed RPC function or UnifiedWalletService

