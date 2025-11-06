# Quick Start: Mifos Database Migration

This is a quick reference guide for starting your migration. See `MIFOS_DATABASE_MIGRATION_GUIDE.md` for detailed instructions.

## 🚀 Quick Steps

### 1. Export from MySQL

```bash
# SSH into your Digital Ocean droplet
ssh root@your-droplet-ip

# Export database structure
mysqldump -u root -p --no-data mifosplatform-tenantedb > mifos_schema.sql

# Export data (specific tables)
mysqldump -u root -p mifosplatform-tenantedb \
  m_client m_loan m_savings_account m_office m_staff \
  m_product_loan m_loan_transaction > mifos_core_tables.sql

# Download to local machine
scp root@your-droplet-ip:/path/to/mifos_schema.sql ./
```

### 2. Convert Schema

```bash
# Make Python script executable
chmod +x scripts/convert_mysql_to_postgresql.py

# Convert MySQL schema to PostgreSQL
python scripts/convert_mysql_to_postgresql.py mifos_schema.sql -o mifos_schema_postgresql.sql
```

### 3. Review and Adjust

⚠️ **IMPORTANT**: Review the converted SQL manually before importing!

Common issues to check:
- ENUM types may need manual conversion
- Data type mismatches
- Index definitions
- Foreign key constraints

### 4. Create Tables in Supabase

**Option A: Via Supabase Dashboard**
1. Go to SQL Editor
2. Copy your converted schema
3. Execute

**Option B: Via Migration**
```bash
# Create new migration
supabase migration new create_mifos_tables

# Edit the migration file, paste your schema
# Then apply
supabase db push
```

### 5. Import Data

**Option A: CSV Import (Recommended)**

```bash
# Export MySQL table as CSV (on droplet)
mysql -u root -p -e "SELECT * INTO OUTFILE '/tmp/m_client.csv' 
FIELDS TERMINATED BY ',' ENCLOSED BY '\"' 
LINES TERMINATED BY '\n' 
FROM mifosplatform-tenantedb.m_client;"

# Download CSV
scp root@your-droplet-ip:/tmp/m_client.csv ./

# Install dependencies
npm install

# Import to Supabase
npm run import:csv m_client.csv m_client mifos
```

**Option B: SQL Import**

```bash
# Convert data export to PostgreSQL format
python scripts/convert_mysql_to_postgresql.py mifos_data.sql

# Import via psql
psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres" \
  < mifos_data_postgresql.sql
```

### 6. Set Up Ongoing Incremental Sync

**This keeps your Supabase database up-to-date with new Mifos data automatically!**

#### Initial Setup:

```bash
# 1. Create sync log table in Supabase
psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres" \
  < scripts/create_sync_log_table.sql

# 2. Configure environment variables
# Add to .env.local and production:
# MYSQL_HOST=your-mysql-host (e.g., 165.227.202.189)
# MYSQL_PORT=3306
# MYSQL_USER=your-mysql-user
# MYSQL_PASSWORD=your-password
# MYSQL_DATABASE=mifosplatform-tenantedb
# CRON_SECRET=your-random-secure-string

# 3. Test manual sync first
npm run sync:full       # Initial full sync (one-time)
npm run sync:incremental # Test incremental sync
```

#### Set Up Automated Sync:

**Option A: Using cron-job.org (Recommended)**
1. Go to [cron-job.org](https://cron-job.org)
2. Create cron job:
   - URL: `https://eazzypay.online/api/cron/sync-mifos`
   - Schedule: `*/15 * * * *` (every 15 minutes)
   - Header: `Authorization: Bearer your-cron-secret`

**Option B: Server cron (Digital Ocean)**
```bash
# Add to crontab (crontab -e):
*/15 * * * * /var/www/eazzypay/scripts/run-sync.sh
```

📖 **See `INCREMENTAL_SYNC_SETUP.md` for detailed setup instructions**

### 7. Update Application Code

Replace API calls with database queries:

**Before:**
```typescript
// Making API calls to Mifos
const response = await fetch(`${mifosUrl}/clients`, { headers })
const clients = await response.json()
```

**After:**
```typescript
// Query directly from Supabase
import { getMifosClients } from '@/lib/mifos-db'

const clients = await getMifosClients({ officeId: 1 })
```

## 📋 Environment Variables Needed

Add to your `.env.local`:

```env
# Supabase (already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MySQL (for sync script)
MYSQL_HOST=your-digital-ocean-droplet-ip
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=mifosplatform-tenantedb
```

## 🔧 Prerequisites

```bash
# Install Python 3 (for conversion script)
# Install MySQL client tools
# Install Node.js dependencies
npm install
```

## 📝 Checklist

- [ ] Exported MySQL schema and data
- [ ] Converted schema to PostgreSQL format
- [ ] Reviewed and adjusted converted SQL
- [ ] Created tables in Supabase
- [ ] Imported data (CSV or SQL)
- [ ] Verified data integrity
- [ ] Set up sync script (optional)
- [ ] Updated application code to use Supabase queries
- [ ] Tested queries and performance

## 🆘 Troubleshooting

**Schema conversion errors?**
- Manually review ENUM types
- Check data type mappings
- Verify index definitions

**Import failures?**
- Check for foreign key constraints
- Verify data types match
- Check for NULL values in required fields

**Sync script errors?**
- Verify MySQL connection details
- Check Supabase credentials
- Ensure tables exist in Supabase

## 📚 Full Documentation

See `MIFOS_DATABASE_MIGRATION_GUIDE.md` for:
- Detailed step-by-step instructions
- Advanced configuration options
- Performance optimization tips
- Troubleshooting guide

## 🎯 Next Steps After Migration

1. ✅ Update API routes to use `lib/mifos-db.ts` helpers
2. ✅ Remove unnecessary Mifos API authentication code
3. ✅ Set up scheduled sync jobs (cron)
4. ✅ Monitor query performance
5. ✅ Create database backups

---

**Ready to start?** Follow the steps above and refer to the full guide for detailed explanations.

