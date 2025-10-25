// Script to check if all SMS-related tables exist in the database
// Run this to verify the database schema before testing the SMS features

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSMSTables() {
  console.log('🔍 SMS Tables Check')
  console.log('==================\n')

  const requiredTables = [
    'partner_sms_settings',
    'sms_templates', 
    'sms_bulk_campaigns',
    'sms_notifications'
  ]

  const requiredColumns = {
    'sms_bulk_campaigns': [
      'id', 'partner_id', 'campaign_name', 'template_id', 
      'message_content', 'recipient_list', 'total_recipients', 
      'total_cost', 'status', 'scheduled_at', 'sent_at', 
      'created_by', 'created_at', 'updated_at'
    ]
  }

  try {
    for (const tableName of requiredTables) {
      console.log(`📋 Checking table: ${tableName}`)
      
      try {
        // Try to query the table
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log(`   ❌ Table ${tableName} does not exist`)
          } else {
            console.log(`   ⚠️ Table ${tableName} exists but has issues: ${error.message}`)
          }
        } else {
          console.log(`   ✅ Table ${tableName} exists and is accessible`)
          
          // Check specific columns for sms_bulk_campaigns
          if (tableName === 'sms_bulk_campaigns' && requiredColumns[tableName]) {
            console.log(`   🔍 Checking columns for ${tableName}:`)
            
            for (const columnName of requiredColumns[tableName]) {
              try {
                const { error: columnError } = await supabase
                  .from(tableName)
                  .select(columnName)
                  .limit(1)
                
                if (columnError) {
                  console.log(`     ❌ Column ${columnName} missing or inaccessible`)
                } else {
                  console.log(`     ✅ Column ${columnName} exists`)
                }
              } catch (err) {
                console.log(`     ❌ Column ${columnName} missing or inaccessible`)
              }
            }
          }
        }
      } catch (err) {
        console.log(`   ❌ Error checking table ${tableName}: ${err.message}`)
      }
      
      console.log('')
    }

    console.log('🎯 Summary:')
    console.log('===========')
    console.log('If any tables are missing or have missing columns:')
    console.log('1. Run the fix-sms-campaigns-table.sql script in Supabase SQL Editor')
    console.log('2. This will create missing tables and add missing columns')
    console.log('3. Test the SMS campaigns page again')

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkSMSTables()
