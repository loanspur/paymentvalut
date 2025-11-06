/**
 * Mifos X to Supabase Sync Script
 * Syncs data from MySQL (Mifos X) to Supabase PostgreSQL
 * Run as a cron job or scheduled task
 */

import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'

// Configuration
const config = {
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'mifosplatform-tenantedb',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
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
    ],
  },
}

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

let mysqlPool: mysql.Pool | null = null

async function getMysqlConnection() {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return mysqlPool
}

/**
 * Sync a single table from MySQL to Supabase
 */
async function syncTable(
  tableName: string,
  lastSyncTime: Date | null = null
): Promise<{ inserted: number; updated: number; errors: number }> {
  const pool = await getMysqlConnection()
  let inserted = 0
  let updated = 0
  let errors = 0

  try {
    console.log(`Syncing table: ${tableName}...`)

    // Build query to fetch records
    let query = `SELECT * FROM ${tableName}`
    const params: any[] = []

    // If lastSyncTime provided, only sync updated records
    if (lastSyncTime) {
      // Try different updated_on column names
      const possibleColumns = ['updated_on', 'lastmodified_date', 'last_modified_date']
      let updatedColumn = null

      for (const col of possibleColumns) {
        const [columns] = await pool.execute(
          `SHOW COLUMNS FROM ${tableName} LIKE '${col}'`
        )
        if (Array.isArray(columns) && columns.length > 0) {
          updatedColumn = col
          break
        }
      }

      if (updatedColumn) {
        query += ` WHERE ${updatedColumn} > ?`
        params.push(lastSyncTime)
      }
    }

    // Fetch records from MySQL
    const [rows] = await pool.execute(query, params) as [any[], any]

    if (rows.length === 0) {
      console.log(`  No new/updated records in ${tableName}`)
      return { inserted: 0, updated: 0, errors: 0 }
    }

    console.log(`  Found ${rows.length} records to sync`)

    // Process in batches
    for (let i = 0; i < rows.length; i += config.sync.batchSize) {
      const batch = rows.slice(i, i + config.sync.batchSize)

      // Transform MySQL rows to match PostgreSQL schema
      const transformedBatch = batch.map((row) => {
        const transformed: any = {}
        for (const [key, value] of Object.entries(row)) {
          // Convert MySQL specific types
          if (value instanceof Date) {
            transformed[key] = value.toISOString()
          } else if (Buffer.isBuffer(value)) {
            transformed[key] = value.toString()
          } else if (value === null || value === undefined) {
            transformed[key] = null
          } else {
            transformed[key] = value
          }
        }
        return transformed
      })

      try {
        // Upsert into Supabase
        const { error } = await supabase
          .from(`mifos.${tableName}`)
          .upsert(transformedBatch, {
            onConflict: 'id', // Adjust based on your primary key
            ignoreDuplicates: false,
          })

        if (error) {
          console.error(`  Error syncing batch ${i}-${i + batch.length}:`, error)
          errors += batch.length
        } else {
          inserted += batch.length
          console.log(`  Synced batch ${i + 1}-${Math.min(i + config.sync.batchSize, rows.length)}/${rows.length}`)
        }
      } catch (error) {
        console.error(`  Error in batch processing:`, error)
        errors += batch.length
      }
    }

    console.log(`✓ Completed ${tableName}: ${inserted} synced, ${errors} errors`)
    return { inserted, updated, errors }
  } catch (error) {
    console.error(`✗ Error syncing ${tableName}:`, error)
    return { inserted: 0, updated: 0, errors: 1 }
  }
}

/**
 * Get last sync timestamp from Supabase
 */
async function getLastSyncTime(tableName: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('mifos.sync_log')
      .select('last_sync_time')
      .eq('table_name', tableName)
      .order('last_sync_time', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return new Date(data.last_sync_time)
  } catch {
    return null
  }
}

/**
 * Update last sync timestamp
 */
async function updateLastSyncTime(
  tableName: string,
  syncTime: Date
): Promise<void> {
  try {
    await supabase.from('mifos.sync_log').upsert(
      {
        table_name: tableName,
        last_sync_time: syncTime.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'table_name' }
    )
  } catch (error) {
    console.error(`Error updating sync log:`, error)
  }
}

/**
 * Full sync (syncs all records)
 */
export async function fullSync(): Promise<void> {
  console.log('Starting FULL sync...')
  const startTime = new Date()

  for (const table of config.sync.tables) {
    const lastSync = await getLastSyncTime(table)
    const result = await syncTable(table, null) // null = full sync

    if (result.inserted > 0 || result.updated > 0) {
      await updateLastSyncTime(table, new Date())
    }

    // Add delay between tables to avoid overwhelming the database
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const duration = (new Date().getTime() - startTime.getTime()) / 1000
  console.log(`✓ Full sync completed in ${duration}s`)
}

/**
 * Incremental sync (syncs only updated records)
 */
export async function incrementalSync(): Promise<void> {
  console.log('Starting INCREMENTAL sync...')
  const startTime = new Date()

  for (const table of config.sync.tables) {
    const lastSync = await getLastSyncTime(table)
    const result = await syncTable(table, lastSync)

    if (result.inserted > 0 || result.updated > 0) {
      await updateLastSyncTime(table, new Date())
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const duration = (new Date().getTime() - startTime.getTime()) / 1000
  console.log(`✓ Incremental sync completed in ${duration}s`)
}

/**
 * Sync specific table
 */
export async function syncSpecificTable(tableName: string): Promise<void> {
  console.log(`Syncing table: ${tableName}...`)
  const lastSync = await getLastSyncTime(tableName)
  const result = await syncTable(tableName, lastSync)

  if (result.inserted > 0 || result.updated > 0) {
    await updateLastSyncTime(tableName, new Date())
  }

  console.log(`✓ Sync complete for ${tableName}`)
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] || 'incremental'

  try {
    switch (mode) {
      case 'full':
        await fullSync()
        break
      case 'incremental':
        await incrementalSync()
        break
      case 'table':
        const tableName = args[1]
        if (!tableName) {
          console.error('Please provide table name: npm run sync:table <table_name>')
          process.exit(1)
        }
        await syncSpecificTable(tableName)
        break
      default:
        console.error(`Unknown mode: ${mode}`)
        console.log('Usage:')
        console.log('  npm run sync:full        - Full sync all tables')
        console.log('  npm run sync:incremental - Incremental sync (default)')
        console.log('  npm run sync:table <name> - Sync specific table')
        process.exit(1)
    }
  } catch (error) {
    console.error('Sync failed:', error)
    process.exit(1)
  } finally {
    // Close MySQL connection
    if (mysqlPool) {
      await mysqlPool.end()
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { syncTable, getLastSyncTime, updateLastSyncTime }

