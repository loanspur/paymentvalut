# Kulman Database Migration Steps

## ✅ Completed Steps

### 1. Schema Extraction ✓
- **Input**: `kulman.sql` (131 MB - full database with data)
- **Output**: `kulman_schema_only.sql` (176 KB - structure only)
- **Result**: Successfully extracted schema, removed all INSERT statements
- **Size reduction**: 99.9% (removed all data)

### 2. MySQL to PostgreSQL Conversion ✓
- **Input**: `kulman_schema_only.sql` (MySQL format)
- **Output**: `kulman_schema_postgresql.sql` (PostgreSQL format)
- **Schema**: `kulman` (will be created in Supabase)
- **Status**: Converted successfully

---

## 📋 Next Steps

### Step 3: Review Converted Schema (IMPORTANT!)

Before importing, you should review the converted schema for any issues:

```bash
# Open the converted file to review
code kulman_schema_postgresql.sql
# Or use any text editor
```

**Common things to check:**
- ✅ Table names are correct (MySQL uses backticks, PostgreSQL may need quotes)
- ✅ Data types are correctly converted (e.g., `TINYINT(1)` → `BOOLEAN`)
- ✅ ENUM types (may need manual conversion)
- ✅ AUTO_INCREMENT → SERIAL conversions
- ✅ Index definitions
- ✅ Foreign key constraints

### Step 4: Import Schema into Supabase

**Option A: Via Supabase Dashboard (Recommended for first time)**

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open `kulman_schema_postgresql.sql` in your editor
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Check for any errors

**Option B: Via Supabase Migration**

```bash
# Create a new migration
supabase migration new create_kulman_schema

# Copy contents of kulman_schema_postgresql.sql into the new migration file
# Then apply:
supabase db push
```

**Option C: Via psql Command Line**

```bash
# Replace [PASSWORD] and [PROJECT] with your actual values
psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres" \
  < kulman_schema_postgresql.sql
```

### Step 5: Import Data (Optional)

If you need the data, you have two options:

**Option A: Use Incremental Sync (Recommended)**
- Set up sync to pull data directly from MySQL source
- See `INCREMENTAL_SYNC_SETUP.md` for instructions

**Option B: Export & Import Data Manually**

```bash
# 1. On the server, export data as CSV for each table
mysql -u root -p kulman_db -e "SELECT * INTO OUTFILE '/tmp/table_name.csv' 
FIELDS TERMINATED BY ',' ENCLOSED BY '\"' 
LINES TERMINATED BY '\n' 
FROM table_name;"

# 2. Download CSV files
scp root@server:/tmp/*.csv ./

# 3. Import to Supabase using the import script
npm run import:csv table_name.csv table_name kulman
```

### Step 6: Set Up Incremental Sync (For Ongoing Updates)

Once the schema is imported, set up automatic sync to keep data updated:

1. **Create sync log table** (if not exists):
   ```sql
   -- Run in Supabase SQL Editor
   \i scripts/create_sync_log_table.sql
   ```

2. **Configure environment variables**:
   ```env
   MYSQL_HOST=165.227.202.189
   MYSQL_PORT=3306
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=kulman_db  # or whatever the Kulman database name is
   CRON_SECRET=your-random-secure-string
   ```

3. **Update sync script** to include Kulman tables:
   Edit `scripts/sync_mifos_to_supabase.ts` and add Kulman tables to the sync list:
   ```typescript
   tables: [
     // Existing tables...
     // Add Kulman tables:
     'Additional Employment Data',
     'Disbursement info',
     'EmploymentData',
     'Installment Charges',
     'Loan Condition',
     'OrganizationBorrowingData',
     'Unapplied Loan Charges',
     // etc.
   ]
   ```

4. **Set up cron job** (see `INCREMENTAL_SYNC_SETUP.md`)

---

## 📁 Files Created

1. ✅ `kulman_schema_only.sql` - Schema extracted (no data)
2. ✅ `kulman_schema_postgresql.sql` - Converted to PostgreSQL format

## 🔍 Verification

After importing, verify the schema was created correctly:

```sql
-- Check if kulman schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'kulman';

-- List all tables in kulman schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'kulman'
ORDER BY table_name;

-- Check table structure
\d kulman."Table Name"
```

---

## ⚠️ Important Notes

1. **Table Names with Spaces**: Some tables have spaces in their names (e.g., `Additional Employment Data`). PostgreSQL will require quotes around these names:
   ```sql
   SELECT * FROM kulman."Additional Employment Data";
   ```

2. **Schema Prefix**: All queries must include the schema prefix:
   ```sql
   SELECT * FROM kulman."EmploymentData";
   ```

3. **Review Before Import**: Always review the converted SQL before importing to catch any conversion issues.

4. **Backup First**: Always backup your Supabase database before importing new schemas.

---

## 🆘 Troubleshooting

**Import Errors?**
- Check for ENUM types that weren't converted
- Verify table names don't conflict with existing tables
- Check for reserved keywords in PostgreSQL

**Data Type Errors?**
- Review the converted schema file
- Some MySQL-specific types may need manual adjustment

**Permission Errors?**
- Ensure you're using the service role key or have proper permissions
- Check that the schema was created successfully

---

## 📚 Related Documentation

- `QUICK_MIGRATION_START.md` - General migration guide
- `INCREMENTAL_SYNC_SETUP.md` - Set up ongoing sync
- `MIFOS_DATABASE_MIGRATION_GUIDE.md` - Detailed migration guide

