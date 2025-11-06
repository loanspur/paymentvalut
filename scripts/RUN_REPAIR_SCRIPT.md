# How to Run the Wallet Balance Repair Script

The Supabase CLI doesn't have a direct `execute` command. Here are several ways to run the repair script:

## Option 1: Using Supabase Dashboard (Recommended - Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `scripts/repair_wallet_balances.sql`
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute

## Option 2: Using psql (Command Line)

If you have `psql` installed and your database connection details:

```powershell
# Get your connection string from Supabase dashboard
# Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

# Then run:
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f scripts/repair_wallet_balances.sql
```

Or if you have the connection details as environment variables:

```powershell
$env:PGPASSWORD="your_password"
psql -h your_host -U postgres -d postgres -f scripts/repair_wallet_balances.sql
```

## Option 3: Create a Migration File

You can create a migration file that will be applied when you push migrations:

```powershell
# Create a new migration
npx supabase migration new repair_wallet_balances

# Copy the repair script content to the new migration file
# The file will be in: supabase/migrations/[timestamp]_repair_wallet_balances.sql

# Then push the migration
npx supabase db push
```

## Option 4: Using Supabase CLI with psql (If Supabase is running locally)

If you're running Supabase locally:

```powershell
# Get the connection string
npx supabase status

# Then use psql with the local connection string
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f scripts/repair_wallet_balances.sql
```

## Recommended Approach

**For production/remote database**: Use **Option 1** (Supabase Dashboard SQL Editor)
- Safest and easiest
- You can see the results immediately
- Easy to review before running

**For local development**: Use **Option 2** or **Option 4** with psql

## Before Running

⚠️ **IMPORTANT**: Always backup your database before running repair scripts!

1. In Supabase Dashboard, go to **Database** → **Backups**
2. Create a backup or ensure you have a recent backup
3. Then proceed with running the repair script

## After Running

Run the verification query to check if balances are now consistent:

```sql
-- Copy this query and run it in SQL Editor
WITH wallet_balance_calc AS (
    SELECT 
        pw.id AS wallet_id,
        pw.partner_id,
        pw.current_balance AS stored_balance,
        COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS calculated_balance,
        pw.current_balance - COALESCE(SUM(CASE WHEN wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) AS balance_difference
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

Expected result after repair:
- `inconsistent_wallets: 0`
- `total_difference: 0.00` (or very close to 0)

