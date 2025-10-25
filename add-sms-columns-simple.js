// Simple script to add missing SMS columns
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addMissingColumns() {
  try {
    console.log('🔄 Adding missing SMS columns...')
    
    // Add columns to sms_bulk_campaigns table
    const campaignsColumns = [
      'sent_count INTEGER DEFAULT 0',
      'delivered_count INTEGER DEFAULT 0', 
      'failed_count INTEGER DEFAULT 0',
      'message_content TEXT',
      'recipient_list JSONB DEFAULT \'[]\'',
      'total_recipients INTEGER DEFAULT 0',
      'total_cost DECIMAL(15,4) DEFAULT 0.00',
      'created_by UUID',
      'updated_at TIMESTAMP DEFAULT NOW()'
    ]
    
    for (const column of campaignsColumns) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `ALTER TABLE sms_bulk_campaigns ADD COLUMN IF NOT EXISTS ${column};` 
        })
        
        if (error) {
          console.log(`⚠️ Column might already exist: ${column.split(' ')[0]}`)
        } else {
          console.log(`✅ Added column: ${column.split(' ')[0]}`)
        }
      } catch (err) {
        console.log(`⚠️ Column might already exist: ${column.split(' ')[0]}`)
      }
    }
    
    // Add columns to sms_notifications table
    const notificationsColumns = [
      'bulk_campaign_id UUID REFERENCES sms_bulk_campaigns(id) ON DELETE SET NULL',
      'sent_at TIMESTAMP',
      'error_message TEXT'
    ]
    
    for (const column of notificationsColumns) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `ALTER TABLE sms_notifications ADD COLUMN IF NOT EXISTS ${column};` 
        })
        
        if (error) {
          console.log(`⚠️ Column might already exist: ${column.split(' ')[0]}`)
        } else {
          console.log(`✅ Added column: ${column.split(' ')[0]}`)
        }
      } catch (err) {
        console.log(`⚠️ Column might already exist: ${column.split(' ')[0]}`)
      }
    }
    
    console.log('✅ Column addition completed!')
    
    // Test the columns exist by querying the tables
    console.log('\n📋 Testing column existence...')
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from('sms_bulk_campaigns')
      .select('id, sent_count, delivered_count, failed_count, message_content, recipient_list, total_recipients, total_cost, created_by, updated_at')
      .limit(1)
    
    if (campaignsError) {
      console.log('❌ Error testing campaigns columns:', campaignsError.message)
    } else {
      console.log('✅ sms_bulk_campaigns columns are accessible')
    }
    
    const { data: notifications, error: notificationsError } = await supabase
      .from('sms_notifications')
      .select('id, bulk_campaign_id, sent_at, error_message')
      .limit(1)
    
    if (notificationsError) {
      console.log('❌ Error testing notifications columns:', notificationsError.message)
    } else {
      console.log('✅ sms_notifications columns are accessible')
    }
    
  } catch (err) {
    console.error('❌ Error adding columns:', err.message)
  }
}

addMissingColumns()
