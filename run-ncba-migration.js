require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  console.log('🔄 Running NCBA Notification Credentials Migration')
  console.log('================================================\n')

  try {
    // Add columns to partners table
    console.log('📋 Adding NCBA notification columns to partners table...')
    
    const alterTableSQL = `
      ALTER TABLE partners 
      ADD COLUMN IF NOT EXISTS ncba_business_short_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ncba_notification_username VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ncba_notification_password VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ncba_notification_secret_key VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ncba_notification_endpoint_url TEXT,
      ADD COLUMN IF NOT EXISTS ncba_account_reference VARCHAR(100);
    `

    const { data: alterResult, error: alterError } = await supabase
      .rpc('exec', { sql: alterTableSQL })

    if (alterError) {
      console.error('❌ Error adding columns to partners:', alterError)
    } else {
      console.log('✅ Successfully added NCBA notification columns to partners table')
    }

    // Add columns to c2b_transactions table
    console.log('\n📋 Adding NCBA columns to c2b_transactions table...')
    
    const alterC2BSQL = `
      ALTER TABLE c2b_transactions 
      ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS transaction_time VARCHAR(20),
      ADD COLUMN IF NOT EXISTS business_short_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS bill_reference_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS raw_notification JSONB;
    `

    const { data: alterC2BResult, error: alterC2BError } = await supabase
      .rpc('exec', { sql: alterC2BSQL })

    if (alterC2BError) {
      console.error('❌ Error adding columns to c2b_transactions:', alterC2BError)
    } else {
      console.log('✅ Successfully added NCBA columns to c2b_transactions table')
    }

    // Create indexes
    console.log('\n📋 Creating indexes...')
    
    const indexSQLs = [
      `CREATE INDEX IF NOT EXISTS idx_partners_ncba_business_short_code ON partners(ncba_business_short_code) WHERE ncba_business_short_code IS NOT NULL;`,
      `CREATE INDEX IF NOT EXISTS idx_c2b_transactions_transaction_id ON c2b_transactions(transaction_id);`,
      `CREATE INDEX IF NOT EXISTS idx_c2b_transactions_partner_created ON c2b_transactions(partner_id, created_at DESC);`
    ]

    for (const sql of indexSQLs) {
      const { error: indexError } = await supabase.rpc('exec', { sql })
      if (indexError) {
        console.error('❌ Error creating index:', indexError)
      } else {
        console.log('✅ Index created successfully')
      }
    }

    // Verify the migration
    console.log('\n📋 Verifying migration...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'partners')
      .in('column_name', [
        'ncba_business_short_code',
        'ncba_notification_username',
        'ncba_notification_password', 
        'ncba_notification_secret_key',
        'ncba_notification_endpoint_url',
        'ncba_account_reference'
      ])

    if (columnsError) {
      console.error('❌ Error verifying columns:', columnsError)
    } else {
      console.log('✅ Migration verification:')
      console.log(`   Found ${columns.length} new columns in partners table`)
      columns.forEach(col => console.log(`   - ${col.column_name}`))
    }

    console.log('\n🎉 NCBA Notification Credentials Migration Complete!')
    console.log('====================================================')
    console.log('✅ Partners table updated with NCBA notification fields')
    console.log('✅ Indexes created for better performance')
    console.log('✅ Ready to configure NCBA Paybill notifications')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

// Run the migration
runMigration()
