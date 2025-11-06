# Incremental Sync Setup: Mifos MySQL → Supabase PostgreSQL

This guide explains how to set up automatic incremental data synchronization from Mifos MySQL database to your Supabase PostgreSQL database.

## 📋 Overview

The incremental sync system will:
- ✅ Only sync **new and updated records** (not all data)
- ✅ Track last sync time per table
- ✅ Handle updates and inserts automatically (upsert)
- ✅ Run automatically on a schedule
- ✅ Log sync status for monitoring

---

## 🚀 Quick Setup

### Step 1: Set Up Sync Log Table

First, create the sync log table in Supabase to track sync operations:

```sql
-- Run this in Supabase SQL Editor
-- Or via migration:
```

You can use the existing migration file:
```bash
# Apply the sync log table migration
supabase db push
```

Or run directly:
```bash
psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres" \
  < scripts/create_sync_log_table.sql
```

### Step 2: Configure Environment Variables

Add these to your `.env.local` (for local development) and your production environment:

```env
# MySQL/Mifos Connection
MYSQL_HOST=165.227.202.189
MYSQL_PORT=3306
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=mifosplatform-tenantedb

# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=https://mapgmmiobityxaaevomp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**For Digital Ocean Droplet:**
- Update your `.env` file on the server
- Make sure MySQL allows connections from your application server
- Test connection first with manual sync

### Step 3: Test Manual Sync

Test the sync script manually first:

```bash
# Test incremental sync (only new/updated records)
npm run sync:incremental

# Or full sync (all records - use only initially)
npm run sync:full

# Or sync specific table
npm run sync:table m_client
```

---

## ⚙️ Setting Up Automated Sync

You have several options for automating the sync:

---

## Option 1: API Endpoint + Cron-Job.org (Recommended)

This is the most flexible and reliable option.

### Step 1: Create API Endpoint

Create `app/api/cron/sync-mifos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { incrementalSync } from '@/scripts/sync_mifos_to_supabase'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting incremental Mifos sync...')
    await incrementalSync()
    
    return NextResponse.json({
      success: true,
      message: 'Incremental sync completed',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
```

### Step 2: Add CRON_SECRET to Environment

Add to your `.env.local` and production environment:
```env
CRON_SECRET=your-random-secure-string-here
```

### Step 3: Set Up Cron-Job.org

1. Go to [cron-job.org](https://cron-job.org)
2. Create a new cron job:
   - **Title**: Payment Vault - Mifos Incremental Sync
   - **URL**: `https://eazzypay.online/api/cron/sync-mifos`
   - **Schedule**: `*/15 * * * *` (Every 15 minutes)
     - Or `*/30 * * * *` for every 30 minutes
     - Or `0 * * * *` for every hour
   - **Method**: GET
   - **Headers**: 
     - `Authorization: Bearer your-random-secure-string-here`
   - **Timeout**: 600 seconds (10 minutes)
   - **Expected Status**: 200

---

## Option 2: Server-Side Cron (Digital Ocean Droplet)

If you're running on a Digital Ocean droplet, you can use Linux cron directly.

### Step 1: Create Sync Script

Create `scripts/run-sync.sh`:

```bash
#!/bin/bash
# Sync script for cron job

# Navigate to project directory
cd /var/www/eazzypay

# Load environment variables
export $(cat .env | xargs)

# Run incremental sync
npm run sync:incremental >> /var/log/mifos-sync.log 2>&1

# Log completion
echo "$(date): Sync completed" >> /var/log/mifos-sync.log
```

Make it executable:
```bash
chmod +x scripts/run-sync.sh
```

### Step 2: Add to Crontab

```bash
# Edit crontab
crontab -e

# Add this line (runs every 15 minutes):
*/15 * * * * /var/www/eazzypay/scripts/run-sync.sh

# Or every hour:
0 * * * * /var/www/eazzypay/scripts/run-sync.sh
```

### Step 3: Monitor Logs

```bash
# View sync logs
tail -f /var/log/mifos-sync.log
```

---

## Option 3: Next.js API Route + Vercel Cron

If using Vercel, you can use Vercel Cron (or cron-job.org with the API endpoint).

### Create API Endpoint (same as Option 1)

Then in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-mifos",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## 📊 Monitoring Sync Status

### Check Sync Log Table

Query the sync log to see last sync times:

```sql
-- View sync status for all tables
SELECT 
  table_name,
  last_sync_time,
  records_synced,
  status,
  error_message,
  updated_at
FROM mifos.sync_log
ORDER BY last_sync_time DESC;

-- Check for failed syncs
SELECT *
FROM mifos.sync_log
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

### Check Sync Status via API

Create a monitoring endpoint:

```typescript
// app/api/admin/sync-status/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('mifos.sync_log')
    .select('*')
    .order('last_sync_time', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sync_status: data })
}
```

---

## 🔧 Configuration Options

### Adjust Sync Frequency

Update your cron schedule based on your needs:

- **High Frequency (Real-time)**: `*/5 * * * *` (Every 5 minutes)
- **Medium Frequency**: `*/15 * * * *` (Every 15 minutes) ⭐ Recommended
- **Low Frequency**: `*/30 * * * *` (Every 30 minutes)
- **Hourly**: `0 * * * *` (Every hour at minute 0)
- **Daily**: `0 2 * * *` (Every day at 2 AM)

### Adjust Tables to Sync

Edit `scripts/sync_mifos_to_supabase.ts`:

```typescript
sync: {
  batchSize: 1000,
  tables: [
    'm_client',
    'm_loan',
    'm_savings_account',
    'm_office',
    'm_staff',
    'm_product_loan',
    'm_loan_transaction',
    'm_savings_account_transaction',
    // Add more tables as needed
    'm_deposit_account_on_hold_transaction',
    'm_loan_repayment_schedule',
  ],
}
```

### Adjust Batch Size

For large tables, you may want to reduce batch size:

```typescript
sync: {
  batchSize: 500, // Reduce if you have memory constraints
  tables: [...],
}
```

---

## 🐛 Troubleshooting

### Sync Not Running

1. **Check cron job status**:
   ```bash
   # For cron-job.org, check dashboard
   # For server cron, check logs
   tail -f /var/log/mifos-sync.log
   ```

2. **Check environment variables**:
   ```bash
   # Verify MySQL connection
   mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE -e "SELECT 1"
   ```

3. **Test sync manually**:
   ```bash
   npm run sync:incremental
   ```

### Connection Errors

- **MySQL connection refused**: Check firewall, MySQL user permissions, and that MySQL is running
- **Supabase connection error**: Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- **Network timeout**: Increase timeout in cron job settings

### Missing Updated Records

- Check if tables have `updated_on`, `lastmodified_date`, or similar timestamp columns
- The script auto-detects these columns, but some tables may not have them
- For tables without timestamps, use full sync or add a timestamp column

### Primary Key Conflicts

- Ensure Supabase tables have the same primary key as MySQL tables
- The script uses `onConflict: 'id'` - adjust if your primary key is different

---

## 📈 Best Practices

1. **Start with Full Sync**: Run full sync once to populate initial data
   ```bash
   npm run sync:full
   ```

2. **Then Use Incremental**: Switch to incremental for ongoing updates
   ```bash
   npm run sync:incremental
   ```

3. **Monitor Regularly**: Check sync logs weekly to ensure it's working

4. **Test After Schema Changes**: If you add new tables, test sync manually first

5. **Backup Before Full Sync**: Always backup Supabase before running full sync

6. **Schedule During Low Traffic**: If possible, schedule during off-peak hours

---

## 🎯 Recommended Setup

For most use cases, I recommend:

1. **API Endpoint + Cron-Job.org** (Option 1)
   - ✅ Reliable external service
   - ✅ Easy to monitor
   - ✅ Can pause/resume easily
   - ✅ Email alerts on failures

2. **Schedule**: Every 15 minutes (`*/15 * * * *`)
   - Good balance between freshness and server load

3. **Monitoring**: Check sync logs weekly
   - Set up email alerts in cron-job.org for failures

---

## 📝 Summary

After setup:
- ✅ Sync runs automatically every 15 minutes (or your chosen interval)
- ✅ Only new/updated records are synced (incremental)
- ✅ Sync status is logged in `mifos.sync_log` table
- ✅ Your Supabase database stays up-to-date with Mifos data

Need help? Check the sync logs or run manual sync to debug issues.

