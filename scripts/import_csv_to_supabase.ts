/**
 * CSV Import Script for Supabase
 * Imports CSV files exported from MySQL into Supabase tables
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ImportOptions {
  tableName: string
  csvFile: string
  batchSize?: number
  skipLines?: number
  delimiter?: string
  schema?: string
}

/**
 * Import CSV file to Supabase table
 */
async function importCsvToSupabase(options: ImportOptions): Promise<void> {
  const {
    tableName,
    csvFile,
    batchSize = 1000,
    skipLines = 0,
    delimiter = ',',
    schema = 'mifos',
  } = options

  console.log(`Importing ${csvFile} to ${schema}.${tableName}...`)

  // Helper function to parse CSV line with quoted values
  function parseCSVLine(line: string, delim: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delim && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    
    return result
  }

  // Read CSV file
  const fileContent = fs.readFileSync(csvFile, 'utf-8')
  
  // Simple CSV parsing (handles quoted values and commas)
  const lines = fileContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    console.log('No data to import')
    return
  }
  
  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter)
  
  // Parse data rows
  const records: any[] = []
  for (let i = skipLines + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter)
    if (values.length === 0) continue
    
    const record: any = {}
    headers.forEach((header, index) => {
      let value = values[index]
      if (value === 'NULL' || value === 'null' || value === '') {
        value = null
      }
      record[header] = value
    })
    records.push(record)
  }

  console.log(`Found ${records.length} rows in CSV`)

  if (records.length === 0) {
    console.log('No data to import')
    return
  }

  // Transform data (handle MySQL-specific types)
  const transformedRecords = records.map((record: any) => {
    const transformed: any = {}
    
    for (const [key, value] of Object.entries(record)) {
      if (value === null || value === undefined || value === '') {
        transformed[key] = null
      } else if (value === 'NULL' || value === 'null') {
        transformed[key] = null
      } else if (typeof value === 'string') {
        // Try to parse dates
        const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/)
        if (dateMatch) {
          transformed[key] = value
        } else if (value === '1' || value === '0') {
          // Might be boolean
          transformed[key] = value
        } else {
          transformed[key] = value
        }
      } else {
        transformed[key] = value
      }
    }
    
    return transformed
  })

  // Import in batches
  let imported = 0
  let errors = 0

  for (let i = skipLines; i < transformedRecords.length; i += batchSize) {
    const batch = transformedRecords.slice(i, i + batchSize)
    
    try {
      const { error } = await supabase
        .from(`${schema}.${tableName}`)
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error(`Error importing batch ${i}-${i + batch.length}:`, error)
        errors += batch.length
        
        // Try to insert without upsert (might be new table)
        const { error: insertError } = await supabase
          .from(`${schema}.${tableName}`)
          .insert(batch)

        if (insertError) {
          console.error(`  Insert also failed:`, insertError)
        } else {
          console.log(`  Insert succeeded (no conflict)`)
        }
      } else {
        imported += batch.length
        const progress = ((i + batch.length) / transformedRecords.length * 100).toFixed(1)
        console.log(`  Progress: ${i + batch.length}/${transformedRecords.length} (${progress}%)`)
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Error processing batch:`, error)
      errors += batch.length
    }
  }

  console.log(`\n✓ Import complete:`)
  console.log(`  Imported: ${imported} rows`)
  console.log(`  Errors: ${errors} rows`)
}

/**
 * Interactive import mode
 */
async function interactiveImport(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  function question(query: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(query, resolve)
    })
  }

  try {
    console.log('=== CSV to Supabase Import Tool ===\n')

    const csvFile = await question('CSV file path: ')
    if (!fs.existsSync(csvFile)) {
      console.error('File not found:', csvFile)
      rl.close()
      return
    }

    const tableName = await question('Table name (without schema): ')
    const schema = await question('Schema name (default: mifos): ') || 'mifos'
    const batchSizeStr = await question('Batch size (default: 1000): ')
    const batchSize = parseInt(batchSizeStr) || 1000

    await importCsvToSupabase({
      tableName,
      csvFile,
      batchSize,
      schema,
    })
  } finally {
    rl.close()
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    // Interactive mode
    await interactiveImport()
  } else if (args.length >= 2) {
    // Command line mode
    const csvFile = args[0]
    const tableName = args[1]
    const schema = args[2] || 'mifos'
    const batchSize = args[3] ? parseInt(args[3]) : 1000

    if (!fs.existsSync(csvFile)) {
      console.error('CSV file not found:', csvFile)
      process.exit(1)
    }

    await importCsvToSupabase({
      tableName,
      csvFile,
      batchSize,
      schema,
    })
  } else {
    console.log('Usage:')
    console.log('  npm run import:csv <csv_file> <table_name> [schema] [batch_size]')
    console.log('  npm run import:csv (interactive mode)')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { importCsvToSupabase }

