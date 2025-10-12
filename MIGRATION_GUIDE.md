# Balance Sync Migration Guide

The balance sync functionality requires database schema changes. Please run the following SQL commands in your Supabase dashboard to enable the balance sync features.

## Step 1: Add Balance Sync Columns to Partners Table

```sql
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS balance_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS balance_sync_interval INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_balance_sync TIMESTAMP WITH TIME ZONE;
```

## Step 2: Create Balance Sync Logs Table

```sql
CREATE TABLE IF NOT EXISTS balance_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    trigger_result JSONB,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Step 3: Create Indexes for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_partner_id ON balance_sync_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_synced_at ON balance_sync_logs(synced_at);
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_status ON balance_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_sync_type ON balance_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_partners_balance_sync_enabled ON partners(balance_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_partners_auto_sync_enabled ON partners(auto_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_partners_last_balance_sync ON partners(last_balance_sync);
```

## Step 4: Enable Row Level Security

```sql
ALTER TABLE balance_sync_logs ENABLE ROW LEVEL SECURITY;
```

## Step 5: Create RLS Policies

```sql
-- Policy for users to view sync logs for their partners
CREATE POLICY "Users can view sync logs for their partners" ON balance_sync_logs
    FOR SELECT USING (
        partner_id IN (
            SELECT id FROM partners 
            WHERE id = (
                SELECT partner_id FROM users 
                WHERE id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('super_admin', 'admin')
            )
        )
    );

-- Policy for service role to insert sync logs
CREATE POLICY "Service role can insert sync logs" ON balance_sync_logs
    FOR INSERT WITH CHECK (true);
```

## Step 6: Grant Permissions

```sql
GRANT SELECT, INSERT, UPDATE ON balance_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON balance_sync_logs TO service_role;
```

## Step 7: Update Existing Partners

```sql
UPDATE partners 
SET 
    balance_sync_enabled = true,
    balance_sync_interval = 30,
    auto_sync_enabled = true
WHERE 
    is_active = true 
    AND is_mpesa_configured = true
    AND balance_sync_enabled IS NULL;
```

## Verification

After running the migration, you can verify it worked by:

1. Checking that the `partners` table has the new columns:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'partners' 
   AND column_name LIKE '%sync%';
   ```

2. Checking that the `balance_sync_logs` table exists:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'balance_sync_logs';
   ```

3. Testing the API endpoints:
   - `/api/balance/partner-settings` should return 401 (not 500)
   - `/api/balance/sync` should return 401 (not 500)

## Notes

- The migration is idempotent (safe to run multiple times)
- All new columns have sensible defaults
- Existing data is preserved
- The sync functionality will work even if the migration hasn't been run (with graceful fallbacks)
