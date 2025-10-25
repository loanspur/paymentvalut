// Script to run the SMS columns migration
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('🔄 Running SMS columns migration...')
    
    const sql = fs.readFileSync('add-missing-sms-columns.sql', 'utf8')
    
    // Split the SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`)
        
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        
        if (error) {
          console.error('❌ Statement failed:', error)
        } else {
          console.log('✅ Statement executed successfully')
        }
      }
    }
    
    console.log('✅ Migration completed!')
    
  } catch (err) {
    console.error('❌ Migration error:', err.message)
  }
}

runMigration()
