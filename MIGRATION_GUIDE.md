# 📋 Supabase Migration Guide - Step by Step

## 🚀 Overview
This guide will help you set up the M-Pesa B2C Disbursement System database step by step.

## 📁 Migration Files Order
Run these migrations in the exact order listed below:

1. **001_initial_schema.sql** - Create basic tables
2. **002_seed_kulmnagroup.sql** - Add Kulman Group Limited
3. **003_multiple_shortcodes.sql** - Add multi-partner support
4. **004_correct_company_names.sql** - Fix company name spellings

---

## 🗄️ Step 1: Initial Schema

**File:** `001_initial_schema.sql`

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create partners table
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disbursement_requests table
CREATE TABLE disbursement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin TEXT NOT NULL CHECK (origin IN ('ui', 'ussd')),
    tenant_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    client_request_id TEXT NOT NULL,
    msisdn TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'accepted', 'failed', 'success')),
    conversation_id TEXT,
    transaction_receipt TEXT,
    result_code TEXT,
    result_desc TEXT,
    partner_id UUID REFERENCES partners(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_request_id, partner_id)
);

-- Create disbursement_callbacks table
CREATE TABLE disbursement_callbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_disbursement_requests_status ON disbursement_requests(status);
CREATE INDEX idx_disbursement_requests_conversation_id ON disbursement_requests(conversation_id);
CREATE INDEX idx_disbursement_requests_client_request_id ON disbursement_requests(client_request_id);
CREATE INDEX idx_disbursement_callbacks_conversation_id ON disbursement_callbacks(conversation_id);
CREATE INDEX idx_partners_api_key_hash ON partners(api_key_hash);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disbursement_requests_updated_at BEFORE UPDATE ON disbursement_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🏢 Step 2: Add Kulman Group Limited

**File:** `002_seed_kulmnagroup.sql`

```sql
-- Insert Kulman Group Limited as the first partner
-- API Key: kulmna_sk_live_1234567890abcdef (this will be hashed)
INSERT INTO partners (id, name, api_key_hash, is_active) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Kulman Group Limited',
    'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', -- SHA-256 hash of 'kulmna_sk_live_1234567890abcdef'
    true
);

-- Note: The actual API key for Kulman Group Limited is: kulmna_sk_live_1234567890abcdef
-- This should be shared securely with the client
```

---

## 🔧 Step 3: Add Multi-Partner Support

**File:** `003_multiple_shortcodes.sql`

```sql
-- Add support for multiple M-Pesa short codes per partner
-- This migration adds short code configuration to partners table

-- Add short code configuration columns to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_shortcode TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_consumer_key TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_consumer_secret TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_passkey TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mpesa_environment TEXT DEFAULT 'sandbox';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_mpesa_configured BOOLEAN DEFAULT false;

-- Create index for short code lookups
CREATE INDEX IF NOT EXISTS idx_partners_mpesa_shortcode ON partners(mpesa_shortcode);

-- Update Kulman Group Limited with M-Pesa configuration
UPDATE partners 
SET 
    mpesa_shortcode = '174379',
    mpesa_consumer_key = 'YOUR_MPESA_CONSUMER_KEY_1',
    mpesa_consumer_secret = 'YOUR_MPESA_CONSUMER_SECRET_1',
    mpesa_passkey = 'YOUR_MPESA_PASSKEY_1',
    mpesa_environment = 'sandbox',
    is_mpesa_configured = true
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert two additional partner organizations with their own M-Pesa configurations
INSERT INTO partners (
    id, 
    name, 
    api_key_hash, 
    is_active,
    mpesa_shortcode,
    mpesa_consumer_key,
    mpesa_consumer_secret,
    mpesa_passkey,
    mpesa_environment,
    is_mpesa_configured
) VALUES 
(
    '660e8400-e29b-41d4-a716-446655440001',
    'Finsafe Limited',
    'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890', -- SHA-256 hash of 'finsef_sk_live_1234567890abcdef'
    true,
    '174380',
    'YOUR_FINSEF_MPESA_CONSUMER_KEY',
    'YOUR_FINSEF_MPESA_CONSUMER_SECRET',
    'YOUR_FINSEF_MPESA_PASSKEY',
    'sandbox',
    true
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    'ABC Limited',
    'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcd', -- SHA-256 hash of 'abc_sk_live_1234567890abcdef'
    true,
    '174381',
    'YOUR_ABC_MPESA_CONSUMER_KEY',
    'YOUR_ABC_MPESA_CONSUMER_SECRET',
    'YOUR_ABC_MPESA_PASSKEY',
    'sandbox',
    true
) ON CONFLICT (id) DO NOTHING;

-- Add short code selection to disbursement requests
ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS mpesa_shortcode TEXT;
ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS partner_shortcode_id UUID REFERENCES partners(id);

-- Create index for short code filtering
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_mpesa_shortcode ON disbursement_requests(mpesa_shortcode);
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_partner_shortcode_id ON disbursement_requests(partner_shortcode_id);
```

---

## ✏️ Step 4: Fix Company Names

**File:** `004_correct_company_names.sql`

```sql
-- Correct company names in the database
-- Update to proper spellings: "Kulman Group Limited" and "Finsafe Limited"

-- Update Kulmnagroup Limited to Kulman Group Limited
UPDATE partners 
SET name = 'Kulman Group Limited'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Update Finsef Limited to Finsafe Limited  
UPDATE partners 
SET name = 'Finsafe Limited'
WHERE id = '660e8400-e29b-41d4-a716-446655440001';

-- ABC Limited remains the same
-- No changes needed for ABC Limited as the name is already correct
```

---

## 🚀 How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste each migration file content
5. Click **Run** to execute
6. Repeat for each migration file in order

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset
supabase db push
```

### Option 3: Direct Database Connection
If you have direct database access, you can run these SQL commands directly.

---

## ✅ Verification

After running all migrations, verify by running this query:

```sql
-- Check all partners
SELECT id, name, mpesa_shortcode, is_active, is_mpesa_configured 
FROM partners 
ORDER BY created_at;

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners' 
ORDER BY ordinal_position;
```

---

## 🔧 Next Steps

After running all migrations:

1. **Update M-Pesa Credentials**: Replace placeholder credentials with real ones
2. **Deploy Edge Functions**: Deploy the Supabase Edge Functions
3. **Test the System**: Use the provided test scripts
4. **Configure Environment**: Set up your environment variables

---

## 📞 Support

If you encounter any issues:
1. Check the Supabase logs for errors
2. Verify all migrations ran successfully
3. Ensure your Supabase project has the necessary permissions
4. Contact support if needed

**Good luck with your setup! 🚀**






