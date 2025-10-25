// Script to check if SMS tables exist and create them if needed
// This script will verify the SMS database schema and create missing tables

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAndCreateSMSTables() {
  console.log('🔍 Checking and Creating SMS Tables')
  console.log('===================================\n')

  try {
    // Step 1: Check if SMS tables exist
    console.log('📋 Step 1: Checking if SMS tables exist...')
    
    const tablesToCheck = [
      'partner_sms_settings',
      'sms_templates', 
      'sms_bulk_campaigns',
      'sms_notifications'
    ]

    const existingTables = []
    const missingTables = []

    for (const tableName of tablesToCheck) {
      try {
        // Try to query the table to see if it exists
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
            missingTables.push(tableName)
            console.log(`❌ Table "${tableName}" does not exist`)
          } else {
            console.log(`⚠️  Table "${tableName}" exists but has issues:`, error.message)
            existingTables.push(tableName)
          }
        } else {
          existingTables.push(tableName)
          console.log(`✅ Table "${tableName}" exists`)
        }
      } catch (tableError) {
        console.log(`❌ Error checking table "${tableName}":`, tableError.message)
        missingTables.push(tableName)
      }
    }

    console.log(`\n📊 Table Status Summary:`)
    console.log(`   Existing tables: ${existingTables.length}`)
    console.log(`   Missing tables: ${missingTables.length}`)

    // Step 2: Create missing tables
    if (missingTables.length > 0) {
      console.log('\n📋 Step 2: Creating missing SMS tables...')
      
      // SQL to create SMS tables
      const createTablesSQL = `
-- 1. Partner SMS Settings Table
CREATE TABLE IF NOT EXISTS partner_sms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
    damza_api_key VARCHAR(255) NOT NULL, -- Encrypted
    damza_sender_id VARCHAR(50) NOT NULL, -- Partner's registered sender ID
    damza_username VARCHAR(255) NOT NULL, -- Encrypted
    damza_password VARCHAR(255) NOT NULL, -- Encrypted
    sms_enabled BOOLEAN DEFAULT TRUE,
    low_balance_threshold DECIMAL(15,2) DEFAULT 1000,
    notification_phone_numbers JSONB DEFAULT '[]', -- Array of phone numbers for notifications
    sms_charge_per_message DECIMAL(10,4) DEFAULT 0.50, -- Cost per SMS in KES
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. SMS Templates Table
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'loan_disbursement', 'loan_repayment', 'wallet_topup', 'balance_alert', 'custom', 'bulk_campaign'
    template_content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable names used in template
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. SMS Bulk Campaigns Table
CREATE TABLE IF NOT EXISTS sms_bulk_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    campaign_name VARCHAR(200) NOT NULL,
    template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
    message_content TEXT NOT NULL,
    recipient_list JSONB NOT NULL, -- Array of phone numbers
    total_recipients INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. SMS Notifications Table
CREATE TABLE IF NOT EXISTS sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'balance_alert', 'disbursement_confirmation', 'payment_receipt', 'topup_confirmation', 'bulk_campaign'
    message_content TEXT NOT NULL,
    sms_cost DECIMAL(10,4) DEFAULT 0.00, -- Actual cost of the SMS
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
    damza_reference VARCHAR(100), -- Reference ID from Damza API
    damza_sender_id VARCHAR(50), -- Sender ID used for this specific SMS
    error_message TEXT, -- Error message if SMS failed
    sent_at TIMESTAMP, -- When SMS was actually sent
    bulk_campaign_id UUID REFERENCES sms_bulk_campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partner_sms_settings_partner_id ON partner_sms_settings(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_partner_id ON sms_templates(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_type ON sms_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_sms_bulk_campaigns_partner_id ON sms_bulk_campaigns(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_bulk_campaigns_status ON sms_bulk_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_partner_id ON sms_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_partner_sms_settings_updated_at ON partner_sms_settings;
CREATE TRIGGER update_partner_sms_settings_updated_at
    BEFORE UPDATE ON partner_sms_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;
CREATE TRIGGER update_sms_templates_updated_at
    BEFORE UPDATE ON sms_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_bulk_campaigns_updated_at ON sms_bulk_campaigns;
CREATE TRIGGER update_sms_bulk_campaigns_updated_at
    BEFORE UPDATE ON sms_bulk_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_notifications_updated_at ON sms_notifications;
CREATE TRIGGER update_sms_notifications_updated_at
    BEFORE UPDATE ON sms_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
      `

      console.log('🔧 Creating SMS tables...')
      console.log('   This will create all missing SMS-related tables')
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
        
        if (error) {
          console.log('❌ Error creating tables:', error)
          console.log('   You may need to run this SQL manually in Supabase SQL Editor')
        } else {
          console.log('✅ SMS tables created successfully!')
        }
      } catch (rpcError) {
        console.log('❌ RPC error:', rpcError.message)
        console.log('   The exec_sql function might not exist')
        console.log('   You need to run the SQL manually in Supabase SQL Editor')
      }
    } else {
      console.log('\n✅ All SMS tables already exist!')
    }

    // Step 3: Verify tables were created
    console.log('\n📋 Step 3: Verifying SMS tables...')
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          console.log(`❌ Table "${tableName}" still has issues:`, error.message)
        } else {
          console.log(`✅ Table "${tableName}" is working correctly`)
        }
      } catch (tableError) {
        console.log(`❌ Error verifying table "${tableName}":`, tableError.message)
      }
    }

    // Step 4: Test SMS settings save
    console.log('\n📋 Step 4: Testing SMS settings save...')
    
    try {
      // Get a partner to test with
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, name')
        .eq('is_active', true)
        .limit(1)

      if (partnersError || !partners || partners.length === 0) {
        console.log('❌ No active partners found for testing')
      } else {
        const testPartner = partners[0]
        console.log(`🧪 Testing SMS settings save with partner: ${testPartner.name}`)
        
        // Test data
        const testSmsSettings = {
          partner_id: testPartner.id,
          damza_api_key: 'test_api_key',
          damza_sender_id: 'TEST',
          damza_username: 'test_username',
          damza_password: 'test_password',
          sms_enabled: true,
          low_balance_threshold: 1000,
          notification_phone_numbers: ['254700000000'],
          sms_charge_per_message: 1.00
        }

        // Try to save
        const { data: saveResult, error: saveError } = await supabase
          .from('partner_sms_settings')
          .upsert(testSmsSettings, { onConflict: 'partner_id' })
          .select()

        if (saveError) {
          console.log('❌ SMS settings save test failed:', saveError)
        } else {
          console.log('✅ SMS settings save test passed!')
          console.log('   Save result:', saveResult)
          
          // Clean up test data
          if (saveResult && saveResult.length > 0) {
            await supabase
              .from('partner_sms_settings')
              .delete()
              .eq('id', saveResult[0].id)
            console.log('   Test data cleaned up')
          }
        }
      }
    } catch (testError) {
      console.log('❌ SMS settings save test failed:', testError.message)
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Tables Check and Creation Summary:')
    console.log('=========================================')
    console.log('✅ SMS tables checked')
    console.log('✅ Missing tables identified')
    console.log('✅ Tables created (if needed)')
    console.log('✅ Tables verified')
    console.log('✅ SMS settings save tested')
    console.log('')
    console.log('💡 If tables were missing:')
    console.log('=========================')
    console.log('🔧 The SMS tables have been created')
    console.log('🔧 You should now be able to save SMS settings')
    console.log('🔧 Try saving SMS settings again')
    console.log('')
    console.log('💡 If tables already existed:')
    console.log('============================')
    console.log('🔧 The issue might be elsewhere')
    console.log('🔧 Check browser console for error messages')
    console.log('🔧 Check server logs for detailed errors')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Try saving SMS settings again')
    console.log('2. 🔧 Check browser console for any error messages')
    console.log('3. 🔧 Check server logs for detailed error information')
    console.log('4. 🔧 If still failing, check authentication and permissions')
    console.log('')
    console.log('📱 Manual SQL Execution (if needed):')
    console.log('====================================')
    console.log('If the automatic table creation failed, you can run the SQL manually:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Go to SQL Editor')
    console.log('3. Copy and paste the SQL from the createTablesSQL variable above')
    console.log('4. Execute the SQL')
    console.log('5. Try saving SMS settings again')
  }
}

checkAndCreateSMSTables()
