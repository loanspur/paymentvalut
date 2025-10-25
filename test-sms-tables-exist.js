// Test script to check if SMS tables exist in the database
// Run this script to verify the SMS tables were created successfully

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSMSTablesExist() {
  console.log('🔍 Testing SMS Tables Existence')
  console.log('================================\n')

  const tables = [
    'partner_sms_settings',
    'sms_templates', 
    'sms_notifications',
    'sms_bulk_campaigns'
  ]

  for (const tableName of tables) {
    try {
      console.log(`📋 Testing table: ${tableName}`)
      
      // Try to query the table with a simple select
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Table ${tableName} does NOT exist`)
        } else {
          console.log(`⚠️  Table ${tableName} exists but has an error: ${error.message}`)
        }
      } else {
        console.log(`✅ Table ${tableName} exists and is accessible`)
        console.log(`   Found ${data?.length || 0} records`)
      }
    } catch (err) {
      console.log(`❌ Error testing table ${tableName}: ${err.message}`)
    }
    console.log('')
  }

  console.log('🎯 Summary:')
  console.log('If all tables show ✅, then the migration was successful!')
  console.log('If any tables show ❌, then there might be an issue with the migration.')
}

testSMSTablesExist()
