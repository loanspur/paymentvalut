# Next Steps: Kulman Database Migration

## ✅ Completed Steps

1. ✅ **Schema Extraction** - Extracted schema from `kulman.sql` (131 MB → 176 KB)
2. ✅ **MySQL to PostgreSQL Conversion** - Converted to PostgreSQL format
3. ✅ **Schema Fixes** - Fixed all conversion issues automatically
   - SERIAL syntax errors
   - bit(1) → BOOLEAN
   - Foreign key references
   - Table/column names with spaces

---

## 🎯 Next Steps (In Order)

### Step 3: Quick Schema Review (5-10 minutes)

**Action**: Spot-check the fixed schema file

```bash
# Open the fixed schema file
code kulman_schema_fixed.sql
```

**What to check:**
- [ ] Tables with spaces have quotes: `kulman."Additional Employment Data"`
- [ ] Columns with spaces have quotes: `"Employment Start Date" date`
- [ ] SERIAL types look correct: `BIGSERIAL` or `SERIAL`
- [ ] Foreign keys have schema prefix: `REFERENCES kulman.m_client`

**Status**: ⚡ Quick spot-check recommended before import

---

### Step 4: Import Schema into Supabase ⭐ **NEXT ACTION**

**Choose one method:**

#### Option A: Via Supabase Dashboard (Recommended) 

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Open `kulman_schema_fixed.sql` in your editor
5. Copy the entire file contents
6. Paste into Supabase SQL Editor
7. Click **Run** or press `Ctrl+Enter`
8. Wait for execution (may take a few minutes for 219 tables)
9. Review any errors (if any)

**Pros**: 
- ✅ Visual feedback
- ✅ Easy to see errors
- ✅ Can fix errors immediately

**Cons**: 
- ⚠️ Large files may timeout in browser

---

#### Option B: Via Supabase Migration File

**Steps:**
```bash
# 1. Create new migration
supabase migration new create_kulman_schema

# 2. Copy contents of kulman_schema_fixed.sql into the new migration file
# The file will be in: supabase/migrations/[timestamp]_create_kulman_schema.sql

# 3. Apply migration
supabase db push
```

**Pros**: 
- ✅ Version controlled
- ✅ Can roll back
- ✅ Better for production

**Cons**: 
- ⚠️ Requires Supabase CLI setup

---

#### Option C: Via psql Command Line

**Steps:**
```bash
# Replace [PASSWORD] and [PROJECT] with your actual values
# Get these from Supabase Dashboard → Settings → Database

psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres" \
  < kulman_schema_fixed.sql
```

**Pros**: 
- ✅ Fast execution
- ✅ Good for large files

**Cons**: 
- ⚠️ Requires psql installation
- ⚠️ Less visual feedback

**Status**: 🎯 **READY TO IMPORT**

---

### Step 5: Verify Schema Import

**Run these queries in Supabase SQL Editor:**

```sql
-- 1. Check if schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'kulman';

-- 2. Count tables
SELECT COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'kulman';

-- Expected: Should show 219 tables

-- 3. List some tables with spaces
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'kulman'
  AND table_name LIKE '% %'
ORDER BY table_name
LIMIT 10;

-- 4. Test query a table with spaces
SELECT * FROM kulman."Additional Employment Data" LIMIT 5;
```

**Status**: ✅ Run after import to verify

---

### Step 6: Import Data (Optional)

**You have 2 options:**

#### Option A: Use Incremental Sync (Recommended) ⭐

**Why**: Keeps data updated automatically going forward

**Steps:**
1. Configure sync script (see `INCREMENTAL_SYNC_SETUP.md`)
2. Update environment variables:
   ```env
   MYSQL_HOST=165.227.202.189
   MYSQL_PORT=3306
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=kulman_db  # or actual database name
   ```
3. Update sync tables list in `scripts/sync_mifos_to_supabase.ts`
4. Run initial full sync: `npm run sync:full`
5. Set up automated incremental sync (see `INCREMENTAL_SYNC_SETUP.md`)

**Status**: 📋 Recommended for ongoing updates

---

#### Option B: Manual Data Export/Import

**If you need data immediately:**

```bash
# 1. On server, export specific tables as CSV
mysql -u root -p kulman_db -e "SELECT * INTO OUTFILE '/tmp/table_name.csv' 
FIELDS TERMINATED BY ',' ENCLOSED BY '\"' 
LINES TERMINATED BY '\n' 
FROM table_name;"

# 2. Download CSV files
scp -P 38000 justus@165.227.202.189:/tmp/*.csv ./

# 3. Import to Supabase
npm run import:csv table_name.csv table_name kulman
```

**Status**: ⚠️ Only if you need historical data immediately

---

### Step 7: Set Up Incremental Sync (For Ongoing Updates)

**After schema is imported**, set up automatic sync:

**Steps:**
1. **Create sync log table** in Supabase:
   ```sql
   -- Run in Supabase SQL Editor
   -- Use the existing migration file:
   \i scripts/create_sync_log_table.sql
   ```

2. **Update sync script** to include Kulman tables:
   Edit `scripts/sync_mifos_to_supabase.ts`:
   ```typescript
   tables: [
     // Add Kulman tables you want to sync
     'Additional Employment Data',
     'Disbursement info',
     'EmploymentData',
     'Installment Charges',
     'Loan Condition',
     'OrganizationBorrowingData',
     // ... add more as needed
   ]
   ```

3. **Configure environment variables** (already mentioned in Step 6)

4. **Set up cron job** (see `INCREMENTAL_SYNC_SETUP.md`):
   - Option A: Use [cron-job.org](https://cron-job.org)
   - Option B: Server-side cron on Digital Ocean

**Status**: 📋 Set up after initial import

---

## 📋 Quick Checklist

Use this checklist to track progress:

- [ ] **Step 3**: Quick schema review (spot-check)
- [ ] **Step 4**: Import schema into Supabase ⭐ **NEXT**
- [ ] **Step 5**: Verify schema import (run queries)
- [ ] **Step 6**: Import data (if needed) OR set up incremental sync
- [ ] **Step 7**: Set up incremental sync for ongoing updates

---

## 🚀 Recommended Next Action

**Import the schema now:**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `kulman_schema_fixed.sql`
4. Paste and run

**Then verify** with the queries in Step 5.

---

## 📁 Files Ready

- ✅ `kulman_schema_fixed.sql` - **USE THIS FILE** - Ready for import
- 📄 `KULMAN_MIGRATION_STEPS.md` - Detailed guide
- 📄 `INCREMENTAL_SYNC_SETUP.md` - Sync setup guide
- 📄 `FINAL_SCHEMA_REVIEW.md` - Review notes

---

## ⚠️ Important Notes

1. **Backup First**: Always backup Supabase before importing
2. **Test Environment**: Consider testing on a development Supabase project first
3. **Schema Prefix**: All queries must use `kulman.` prefix
4. **Quotes for Spaces**: Tables/columns with spaces need quotes: `kulman."Table Name"`
5. **Import Time**: 219 tables may take 5-10 minutes to import

---

## 🆘 If You Encounter Errors

**Common import errors:**

1. **Syntax Error**: 
   - Check the specific line mentioned
   - May need manual fix
   - Re-run fix script if needed

2. **Table Already Exists**:
   - Drop existing tables first
   - Or use `CREATE TABLE IF NOT EXISTS` (already in file)

3. **Foreign Key Error**:
   - Verify referenced tables exist
   - May need to import in correct order

4. **Permission Error**:
   - Check Supabase credentials
   - Verify service role key has permissions

---

**Ready to proceed?** Start with **Step 4: Import Schema into Supabase** 🚀



