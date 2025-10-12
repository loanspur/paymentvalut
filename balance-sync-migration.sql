-- Balance Sync Migration SQL
-- Run these commands one by one in your Supabase SQL editor

-- Step 1: Add balance sync columns to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS balance_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS balance_sync_interval INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_balance_sync TIMESTAMP WITH TIME ZONE;

-- Step 2: Create balance_sync_logs table
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

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_partner_id ON balance_sync_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_synced_at ON balance_sync_logs(synced_at);
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_status ON balance_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_balance_sync_logs_sync_type ON balance_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_partners_balance_sync_enabled ON partners(balance_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_partners_auto_sync_enabled ON partners(auto_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_partners_last_balance_sync ON partners(last_balance_sync);

-- Step 4: Enable Row Level Security
ALTER TABLE balance_sync_logs ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
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

CREATE POLICY "Service role can insert sync logs" ON balance_sync_logs
    FOR INSERT WITH CHECK (true);

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE ON balance_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON balance_sync_logs TO service_role;

-- Step 7: Update existing partners with default sync settings
UPDATE partners 
SET 
    balance_sync_enabled = true,
    balance_sync_interval = 30,
    auto_sync_enabled = true
WHERE 
    is_active = true 
    AND is_mpesa_configured = true
    AND balance_sync_enabled IS NULL;