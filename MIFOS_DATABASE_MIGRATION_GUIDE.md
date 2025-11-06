# Mifos X Database Migration Guide: MySQL to Supabase (PostgreSQL)

This guide will walk you through migrating the entire Mifos X MySQL database from your Digital Ocean droplet into Supabase (PostgreSQL). This will allow you to query data directly from Supabase instead of making complex API calls.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Overview of Migration Process](#overview-of-migration-process)
3. [Step 1: Analyze Mifos X Database Schema](#step-1-analyze-mifos-x-database-schema)
4. [Step 2: Export Data from MySQL](#step-2-export-data-from-mysql)
5. [Step 3: Convert MySQL Schema to PostgreSQL](#step-3-convert-mysql-schema-to-postgresql)
6. [Step 4: Create Tables in Supabase](#step-4-create-tables-in-supabase)
7. [Step 5: Import Data into Supabase](#step-5-import-data-into-supabase)
8. [Step 6: Set Up Ongoing Sync (Optional)](#step-6-set-up-ongoing-sync-optional)
9. [Step 7: Update Application Code](#step-7-update-application-code)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Access to Digital Ocean Droplet** - SSH access to your MySQL server
- ✅ **Supabase Account** - Active Supabase project
- ✅ **MySQL Client Tools** - `mysqldump` or MySQL Workbench
- ✅ **PostgreSQL Client Tools** - `psql` or Supabase CLI
- ✅ **Python 3.x** (optional, for migration scripts)
- ✅ **Understanding of Mifos X tables** - Key tables you need to migrate

---

## Overview of Migration Process

```
MySQL (Digital Ocean) → Export → Convert → Supabase (PostgreSQL)
```

**Strategy Options:**

1. **Full Migration** - Migrate entire database (recommended for initial setup)
2. **Selective Migration** - Migrate only core tables you need
3. **Incremental Sync** - Set up periodic sync for ongoing updates

**Recommended Approach:** Start with selective migration of core tables, then add others as needed.

---

## Step 1: Analyze Mifos X Database Schema

First, identify which tables you need to migrate. Mifos X has hundreds of tables, but you likely need these core ones:

### Core Mifos X Tables to Migrate

```sql
-- Client Management
m_client (clients)
m_client_address (client addresses)
m_client_identifier (client identifiers)

-- Loan Management
m_loan (loans)
m_loan_repayment_schedule (loan repayment schedules)
m_loan_charge (loan charges)
m_loan_transaction (loan transactions)

-- Savings Management
m_savings_account (savings accounts)
m_savings_account_transaction (savings transactions)

-- Office & Staff
m_office (offices)
m_staff (staff/loan officers)

-- Products
m_product_loan (loan products)
m_savings_product (savings products)

-- Additional Core Tables
m_group (groups)
m_currency (currencies)
m_charge (charges)
r_enum_value (enumerations)
```

### Step 1.1: Connect to MySQL and List Tables

**SSH into your Digital Ocean droplet:**

```bash
ssh root@your-droplet-ip
```

**Connect to MySQL:**

```bash
mysql -u root -p mifosplatform-tenantedb
```

**List all tables:**

```sql
SHOW TABLES;
```

**Count records in key tables:**

```sql
SELECT 
  'm_client' as table_name, COUNT(*) as record_count FROM m_client
UNION ALL
SELECT 'm_loan', COUNT(*) FROM m_loan
UNION ALL
SELECT 'm_savings_account', COUNT(*) FROM m_savings_account
UNION ALL
SELECT 'm_office', COUNT(*) FROM m_office;
```

**Export table structure information:**

```sql
-- Get table schemas
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  DATA_LENGTH,
  INDEX_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mifosplatform-tenantedb'
ORDER BY TABLE_NAME;
```

---

## Step 2: Export Data from MySQL

### Option A: Export Using mysqldump (Recommended)

**Export entire database structure:**

```bash
mysqldump -u root -p --no-data mifosplatform-tenantedb > mifos_schema.sql
```

**Export entire database with data:**

```bash
mysqldump -u root -p mifosplatform-tenantedb > mifos_full_export.sql
```

**Export specific tables only:**

```bash
mysqldump -u root -p mifosplatform-tenantedb \
  m_client m_loan m_savings_account m_office m_staff \
  m_product_loan m_loan_transaction > mifos_core_tables.sql
```

**Export data only (no structure):**

```bash
mysqldump -u root -p --no-create-info mifosplatform-tenantedb > mifos_data_only.sql
```

**Export as CSV (for specific tables):**

```sql
-- In MySQL, export to CSV
SELECT * INTO OUTFILE '/tmp/m_client.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM m_client;
```

### Option B: Export Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your Digital Ocean MySQL server
3. Navigate to **Server** → **Data Export**
4. Select database: `mifosplatform-tenantedb`
5. Select tables to export
6. Choose **Export to Self-Contained File**
7. Click **Start Export**

### Step 2.1: Download Export Files

```bash
# From your local machine, download the exported SQL file
scp root@your-droplet-ip:/path/to/mifos_export.sql ./mifos_export.sql
```

---

## Step 3: Convert MySQL Schema to PostgreSQL

MySQL and PostgreSQL have syntax differences. You'll need to convert the schema.

### Key Differences to Handle:

1. **Backticks → Double quotes**
   - MySQL: `` `table_name` ``
   - PostgreSQL: `"table_name"` (or just `table_name`)

2. **AUTO_INCREMENT → SERIAL/BIGSERIAL**
   - MySQL: `AUTO_INCREMENT`
   - PostgreSQL: `SERIAL` or `BIGSERIAL`

3. **Data Types**
   - MySQL: `TINYINT(1)` → PostgreSQL: `BOOLEAN`
   - MySQL: `TEXT` → PostgreSQL: `TEXT` (same)
   - MySQL: `DATETIME` → PostgreSQL: `TIMESTAMP`
   - MySQL: `LONGTEXT` → PostgreSQL: `TEXT`

4. **Index Syntax**
   - MySQL: `KEY idx_name (column)`
   - PostgreSQL: `CREATE INDEX idx_name ON table(column)`

5. **Enum Handling**
   - MySQL: `ENUM('value1', 'value2')`
   - PostgreSQL: Use `VARCHAR` with CHECK constraint or create custom type

### Option A: Manual Conversion Script (Python)

Create a conversion script: `mysql_to_postgres.py`

```python
#!/usr/bin/env python3
import re
import sys

def convert_mysql_to_postgresql(mysql_sql):
    # Remove MySQL-specific comments and directives
    sql = mysql_sql
    
    # Replace AUTO_INCREMENT
    sql = re.sub(r'AUTO_INCREMENT\s*', 'SERIAL ', sql, flags=re.IGNORECASE)
    
    # Replace backticks with double quotes (or remove)
    sql = re.sub(r'`([^`]+)`', r'\1', sql)
    
    # Replace TINYINT(1) with BOOLEAN
    sql = re.sub(r'TINYINT\s*\(\s*1\s*\)', 'BOOLEAN', sql, flags=re.IGNORECASE)
    
    # Replace DATETIME with TIMESTAMP
    sql = re.sub(r'DATETIME', 'TIMESTAMP', sql, flags=re.IGNORECASE)
    
    # Replace LONGTEXT with TEXT
    sql = re.sub(r'LONGTEXT', 'TEXT', sql, flags=re.IGNORECASE)
    
    # Replace ENGINE=InnoDB with nothing
    sql = re.sub(r'ENGINE\s*=\s*InnoDB[^;]*', '', sql, flags=re.IGNORECASE)
    
    # Replace DEFAULT CHARSET
    sql = re.sub(r'DEFAULT\s+CHARSET[^;]*', '', sql, flags=re.IGNORECASE)
    
    # Handle ENUM types
    sql = re.sub(
        r"ENUM\s*\(([^)]+)\)",
        lambda m: f"VARCHAR(255) CHECK ({m.group(0)} IN ({m.group(1)}))",
        sql,
        flags=re.IGNORECASE
    )
    
    # Remove MySQL-specific index syntax and convert
    # This is complex and may need manual adjustment
    
    return sql

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python mysql_to_postgresql.py <mysql_file.sql>")
        sys.exit(1)
    
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        mysql_sql = f.read()
    
    postgresql_sql = convert_mysql_to_postgresql(mysql_sql)
    
    output_file = sys.argv[1].replace('.sql', '_postgresql.sql')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(postgresql_sql)
    
    print(f"Converted SQL saved to {output_file}")
```

### Option B: Use Online Converters or Tools

1. **pgloader** - Automated migration tool:
   ```bash
   # Install pgloader
   sudo apt-get install pgloader
   
   # Run migration
   pgloader mysql://user:password@mysql-host/database \
            postgresql://postgres:password@supabase-host:5432/postgres
   ```

2. **AWS Database Migration Service** (if using AWS)

3. **Manual Conversion** - Use a SQL editor and find-replace

### Step 3.1: Create Conversion Script for Your Project

Since you're using Supabase, let's create a migration script tailored to your needs:

Create file: `scripts/convert_mifos_schema.sql`

```sql
-- This is a template for manual conversion
-- Review and adjust based on your actual MySQL schema

-- Example: Convert m_client table
CREATE TABLE IF NOT EXISTS mifos_client (
    id BIGSERIAL PRIMARY KEY,
    account_no VARCHAR(20),
    external_id VARCHAR(100),
    status_enum SMALLINT,
    activation_date DATE,
    office_id BIGINT,
    staff_id BIGINT,
    firstname VARCHAR(50),
    middlename VARCHAR(50),
    lastname VARCHAR(50),
    display_name VARCHAR(100),
    mobile_no VARCHAR(50),
    email_address VARCHAR(100),
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true,
    submitted_on_date DATE,
    submitted_by BIGINT,
    activated_on_date DATE,
    activated_by BIGINT,
    closure_date DATE,
    closed_by BIGINT,
    updated_by BIGINT,
    updated_on TIMESTAMP,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    image_key VARCHAR(100)
);

-- Create indexes
CREATE INDEX idx_mifos_client_office_id ON mifos_client(office_id);
CREATE INDEX idx_mifos_client_staff_id ON mifos_client(staff_id);
CREATE INDEX idx_mifos_client_status ON mifos_client(status_enum);
CREATE INDEX idx_mifos_client_account_no ON mifos_client(account_no);

-- Repeat for other tables...
```

---

## Step 4: Create Tables in Supabase

### Option A: Using Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy your converted SQL schema
5. Execute the query

### Option B: Using Supabase Migrations

Create migration file: `supabase/migrations/092_create_mifos_tables.sql`

```sql
-- Migration: Create Mifos X Tables
-- Description: Create tables to store Mifos X data migrated from MySQL

-- Create schema if not exists (optional, for organization)
CREATE SCHEMA IF NOT EXISTS mifos;

-- Set search path
SET search_path TO mifos, public;

-- Core Tables (add your converted schema here)
-- Example structure:

CREATE TABLE IF NOT EXISTS mifos.m_client (
    id BIGSERIAL PRIMARY KEY,
    account_no VARCHAR(20),
    -- Add all columns from your MySQL schema
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_office_id ON mifos.m_client(office_id);
CREATE INDEX IF NOT EXISTS idx_client_account_no ON mifos.m_client(account_no);

-- Add other tables as needed
```

### Step 4.1: Apply Migration

```bash
# Using Supabase CLI
supabase migration new create_mifos_tables
# Then edit the generated file and add your schema

# Apply migration
supabase db push
```

Or apply directly via SQL Editor in Supabase Dashboard.

---

## Step 5: Import Data into Supabase

### Option A: Using CSV Import (Recommended for Large Data)

**Step 5.1: Export MySQL data as CSV**

```bash
# On your Digital Ocean droplet
mysql -u root -p mifosplatform-tenantedb -e "
SELECT * FROM m_client" | sed 's/\t/,/g' > m_client.csv

# Or use MySQL's INTO OUTFILE
mysql -u root -p -e "
SELECT * INTO OUTFILE '/tmp/m_client.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '\"'
LINES TERMINATED BY '\n'
FROM mifosplatform-tenantedb.m_client;"
```

**Step 5.2: Download CSV files**

```bash
scp root@your-droplet-ip:/tmp/m_client.csv ./
```

**Step 5.3: Import into Supabase**

**Using Supabase Dashboard:**

1. Go to **Table Editor** → Select your table
2. Click **Import** → Upload CSV
3. Map columns and import

**Using SQL (psql):**

```bash
# Connect to Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres"

# Import CSV
\copy mifos.m_client FROM 'm_client.csv' WITH (FORMAT CSV, HEADER true);
```

**Using Supabase API (Python script):**

```python
import csv
import os
from supabase import create_client, Client

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def import_csv_to_table(csv_file, table_name):
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = [row for row in reader]
        
        # Insert in batches
        batch_size = 1000
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i+batch_size]
            supabase.table(table_name).insert(batch).execute()
            print(f"Imported {i+len(batch)}/{len(rows)} rows")

# Usage
import_csv_to_table('m_client.csv', 'mifos.m_client')
```

### Option B: Using SQL INSERT Statements

If you converted your mysqldump to PostgreSQL format:

```bash
# Connect and import
psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres" < converted_mifos_data.sql
```

### Option C: Using pgloader (Automated)

```bash
pgloader mysql://root:password@mysql-host/mifosplatform-tenantedb \
         postgresql://postgres:password@supabase-host:5432/postgres \
         --schema-only
```

---

## Step 6: Set Up Ongoing Sync (Optional)

If you want to keep Supabase updated with changes from Mifos X:

### Option A: Scheduled Sync Script

Create: `scripts/sync_mifos_to_supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
})

async function syncTable(tableName: string, lastSyncTime: Date) {
  // Fetch updated records from MySQL
  const [rows] = await mysqlPool.execute(
    `SELECT * FROM ${tableName} WHERE updated_on > ?`,
    [lastSyncTime]
  )
  
  // Upsert into Supabase
  if (rows.length > 0) {
    await supabase.from(`mifos.${tableName}`).upsert(rows)
  }
  
  return rows.length
}

// Run sync
async function syncAll() {
  const lastSync = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  
  await syncTable('m_client', lastSync)
  await syncTable('m_loan', lastSync)
  // Add other tables
}

// Run as cron job
syncAll()
```

### Option B: Real-time Sync via Webhooks

If Mifos X supports webhooks, set up webhook handlers in Supabase Edge Functions.

### Option C: Manual Periodic Refresh

Run the import process periodically (daily/weekly) using scheduled jobs.

---

## Step 7: Update Application Code

Update your codebase to query Supabase instead of making API calls.

### Before (API Calls):

```typescript
// app/api/mifos/clients/route.ts
async function fetchClientsFromMifos(partner: any, filters: any) {
  const response = await fetch(`${baseUrl}/clients`, { headers })
  return await response.json()
}
```

### After (Direct Database Query):

```typescript
// app/api/mifos/clients/route.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchClientsFromSupabase(partnerId: string, filters: any) {
  let query = supabase
    .from('mifos.m_client')
    .select('*')
  
  if (filters.officeId) {
    query = query.eq('office_id', filters.officeId)
  }
  
  if (filters.loanOfficerId) {
    query = query.eq('staff_id', filters.loanOfficerId)
  }
  
  const { data, error } = await query
  
  return data || []
}
```

### Create Helper Functions

Create: `lib/mifos-db.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getMifosClients(filters?: {
  officeId?: number
  staffId?: number
  status?: string
}) {
  let query = supabase.from('mifos.m_client').select('*')
  
  if (filters?.officeId) query = query.eq('office_id', filters.officeId)
  if (filters?.staffId) query = query.eq('staff_id', filters.staffId)
  if (filters?.status) query = query.eq('status_enum', filters.status)
  
  const { data, error } = await query
  if (error) throw error
  
  return data
}

export async function getMifosLoans(filters?: {
  clientId?: number
  status?: string
}) {
  let query = supabase.from('mifos.m_loan').select('*')
  
  if (filters?.clientId) query = query.eq('client_id', filters.clientId)
  if (filters?.status) query = query.eq('loan_status_id', filters.status)
  
  const { data, error } = await query
  if (error) throw error
  
  return data
}

// Add more helper functions as needed
```

---

## Troubleshooting

### Common Issues

**1. Data Type Mismatches**

**Problem:** PostgreSQL rejects certain MySQL data types

**Solution:**
```sql
-- Cast data types during import
ALTER TABLE mifos.m_client 
ALTER COLUMN status_enum TYPE SMALLINT USING status_enum::SMALLINT;
```

**2. Foreign Key Constraints**

**Problem:** Import fails due to FK constraints

**Solution:**
```sql
-- Disable FK checks during import
SET session_replication_role = 'replica';

-- Import data

-- Re-enable FK checks
SET session_replication_role = 'origin';
```

**3. Large File Imports**

**Problem:** Import fails for large CSV files

**Solution:** Use batch imports or pg_bulkload

**4. Character Encoding Issues**

**Problem:** Special characters appear corrupted

**Solution:**
```bash
# Ensure UTF-8 encoding
iconv -f latin1 -t utf-8 input.csv > output.csv
```

**5. Date Format Issues**

**Problem:** Date formats don't match

**Solution:**
```sql
-- Convert during import
UPDATE mifos.m_client 
SET activation_date = TO_DATE(activation_date_str, 'YYYY-MM-DD');
```

---

## Quick Start Checklist

- [ ] **Step 1:** Analyze and list required tables
- [ ] **Step 2:** Export MySQL database (structure + data)
- [ ] **Step 3:** Convert MySQL schema to PostgreSQL
- [ ] **Step 4:** Create tables in Supabase (via migration)
- [ ] **Step 5:** Import data (CSV or SQL)
- [ ] **Step 6:** Verify data integrity
- [ ] **Step 7:** Update application code to use Supabase queries
- [ ] **Step 8:** Test queries and performance
- [ ] **Step 9:** Set up sync mechanism (optional)
- [ ] **Step 10:** Monitor and optimize

---

## Performance Optimization

### Indexing

```sql
-- Add indexes on frequently queried columns
CREATE INDEX idx_client_account_no ON mifos.m_client(account_no);
CREATE INDEX idx_loan_client_id ON mifos.m_loan(client_id);
CREATE INDEX idx_loan_status ON mifos.m_loan(loan_status_id);
```

### Partitioning (for very large tables)

```sql
-- Partition by date if tables are huge
CREATE TABLE mifos.m_loan_partitioned (
    -- columns
) PARTITION BY RANGE (created_on);
```

---

## Security Considerations

1. **Row Level Security (RLS):** Enable RLS on Supabase tables if needed
2. **Data Encryption:** Ensure sensitive data is encrypted
3. **Access Control:** Use service role key only server-side
4. **Backup:** Set up regular backups of Supabase data

---

## Next Steps

After migration:

1. ✅ Update all API routes to use Supabase queries
2. ✅ Remove unnecessary Mifos API calls
3. ✅ Set up monitoring for query performance
4. ✅ Document new database schema
5. ✅ Create backup strategy

---

## Additional Resources

- [Supabase Migration Guide](https://supabase.com/docs/guides/database/migrations)
- [pgloader Documentation](https://pgloader.readthedocs.io/)
- [PostgreSQL Migration Guide](https://www.postgresql.org/docs/current/migration.html)
- [Mifos X Database Schema Documentation](https://mifos.org/documentation/)

---

**Questions or Issues?** Review the troubleshooting section or check Supabase logs for specific error messages.

