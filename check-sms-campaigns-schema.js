// Script to check the exact schema of sms_bulk_campaigns table
// This will help identify any schema mismatches

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSMSCampaignsSchema() {
  console.log('🔍 SMS Campaigns Schema Check')
  console.log('=============================\n')

  try {
    // Try to query the information_schema directly
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'sms_bulk_campaigns')
      .eq('table_schema', 'public')
      .order('ordinal_position')

    if (error) {
      console.log('❌ Error getting schema:', error)
      
      // Try a different approach - create a test record and see what columns exist
      console.log('\n📋 Alternative: Creating test record to see actual schema...')
      
      const { data: testRecord, error: testError } = await supabase
        .from('sms_bulk_campaigns')
        .insert({
          partner_id: '550e8400-e29b-41d4-a716-446655440000',
          campaign_name: 'Schema Test',
          message_content: 'Test',
          recipient_list: ['254700000000'],
          total_recipients: 1,
          total_cost: 0.50,
          status: 'draft'
        })
        .select()
        .single()

      if (testError) {
        console.log('❌ Error creating test record:', testError)
      } else {
        console.log('✅ Test record created successfully')
        console.log('📊 Actual columns in the table:')
        Object.keys(testRecord).forEach(key => {
          console.log(`   - ${key}: ${typeof testRecord[key]} (${testRecord[key]})`)
        })
        
        // Clean up test record
        await supabase
          .from('sms_bulk_campaigns')
          .delete()
          .eq('id', testRecord.id)
        console.log('🧹 Test record cleaned up')
      }
    } else {
      console.log('✅ Schema retrieved successfully')
      console.log('📊 Columns in sms_bulk_campaigns table:')
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }

    // Check what the API expects vs what exists
    console.log('\n🎯 API Expectations vs Reality:')
    console.log('===============================')
    
    const expectedColumns = [
      'id', 'partner_id', 'campaign_name', 'template_id', 'message_content',
      'recipient_list', 'total_recipients', 'total_cost', 'status',
      'scheduled_at', 'sent_at', 'created_by', 'created_at', 'updated_at'
    ]
    
    const actualColumns = testRecord ? Object.keys(testRecord) : []
    
    console.log('Expected columns:', expectedColumns)
    console.log('Actual columns:', actualColumns)
    
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col))
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col))
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns)
    }
    
    if (extraColumns.length > 0) {
      console.log('⚠️ Extra columns:', extraColumns)
    }
    
    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log('✅ Schema matches API expectations perfectly!')
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message)
  } finally {
    console.log('\n📝 Next Steps:')
    console.log('==============')
    console.log('1. If there are missing columns, add them to the database')
    console.log('2. If there are extra columns, the API should handle them gracefully')
    console.log('3. The 500 error might be caused by a specific column mismatch')
    console.log('4. Check the server logs for the exact error when accessing the page')
  }
}

checkSMSCampaignsSchema()
