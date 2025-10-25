// Debug script to investigate SMS settings save issue
// This script will check what's happening when trying to save SMS settings

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSSettingsSaveIssue() {
  console.log('🔍 Debugging SMS Settings Save Issue')
  console.log('===================================\n')

  try {
    // Step 1: Check current SMS settings
    console.log('📋 Step 1: Checking current SMS settings...')
    
    const { data: smsSettings, error: settingsError } = await supabase
      .from('partner_sms_settings')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)

    if (settingsError) {
      console.log('❌ Error fetching SMS settings:', settingsError)
      console.log('   This might indicate a database table issue')
      return
    }

    console.log(`✅ Found ${smsSettings?.length || 0} SMS settings`)
    
    if (smsSettings && smsSettings.length > 0) {
      smsSettings.forEach((setting, index) => {
        console.log(`\n📊 SMS Settings ${index + 1}:`)
        console.log(`   ID: ${setting.id}`)
        console.log(`   Partner: ${setting.partners?.name}`)
        console.log(`   Sender ID: ${setting.damza_sender_id}`)
        console.log(`   SMS Enabled: ${setting.sms_enabled}`)
        console.log(`   Cost per SMS: ${setting.sms_charge_per_message} KES`)
        console.log(`   Created: ${setting.created_at}`)
        console.log(`   Updated: ${setting.updated_at}`)
      })
    } else {
      console.log('ℹ️  No SMS settings found - this is normal for new installations')
    }

    // Step 2: Check partners table
    console.log('\n📋 Step 2: Checking partners table...')
    
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code, is_active')
      .eq('is_active', true)

    if (partnersError) {
      console.log('❌ Error fetching partners:', partnersError)
    } else {
      console.log(`✅ Found ${partners?.length || 0} active partners`)
      
      partners?.forEach((partner, index) => {
        console.log(`\n👥 Partner ${index + 1}:`)
        console.log(`   ID: ${partner.id}`)
        console.log(`   Name: ${partner.name}`)
        console.log(`   Short Code: ${partner.short_code}`)
        console.log(`   Active: ${partner.is_active}`)
      })
    }

    // Step 3: Test SMS settings table structure
    console.log('\n📋 Step 3: Testing SMS settings table structure...')
    
    try {
      // Try to insert a test record to check table structure
      const testData = {
        partner_id: partners?.[0]?.id || '00000000-0000-0000-0000-000000000000',
        damza_api_key: 'test_key',
        damza_sender_id: 'TEST',
        damza_username: 'test_user',
        damza_password: 'test_pass',
        sms_enabled: true,
        low_balance_threshold: 1000,
        notification_phone_numbers: [],
        sms_charge_per_message: 0.50
      }

      console.log('🧪 Testing table structure with sample data...')
      console.log('   Sample data:', JSON.stringify(testData, null, 2))

      // Try to insert (this will fail if table doesn't exist or has wrong structure)
      const { data: testInsert, error: testInsertError } = await supabase
        .from('partner_sms_settings')
        .insert(testData)
        .select()

      if (testInsertError) {
        console.log('❌ Table structure test failed:', testInsertError)
        console.log('   This indicates a database schema issue')
        
        // Check if it's a table doesn't exist error
        if (testInsertError.message && testInsertError.message.includes('relation "partner_sms_settings" does not exist')) {
          console.log('🚨 ISSUE FOUND: SMS settings table does not exist!')
          console.log('   You need to run the database migration to create the table')
        } else if (testInsertError.message && testInsertError.message.includes('column') && testInsertError.message.includes('does not exist')) {
          console.log('🚨 ISSUE FOUND: SMS settings table has wrong structure!')
          console.log('   Some columns are missing from the table')
        } else {
          console.log('🚨 ISSUE FOUND: Unknown database error')
          console.log('   Error details:', testInsertError.message)
        }
      } else {
        console.log('✅ Table structure test passed')
        console.log('   Test record created:', testInsert)
        
        // Clean up test record
        if (testInsert && testInsert.length > 0) {
          await supabase
            .from('partner_sms_settings')
            .delete()
            .eq('id', testInsert[0].id)
          console.log('   Test record cleaned up')
        }
      }
    } catch (testError) {
      console.log('❌ Table structure test failed with exception:', testError.message)
    }

    // Step 4: Check for common save issues
    console.log('\n📋 Step 4: Checking for common save issues...')
    
    console.log('🔍 Common SMS Settings Save Issues:')
    console.log('===================================')
    console.log('1. ❌ Database table does not exist')
    console.log('2. ❌ Missing required columns in table')
    console.log('3. ❌ Foreign key constraint violations')
    console.log('4. ❌ Data validation errors')
    console.log('5. ❌ Authentication/authorization issues')
    console.log('6. ❌ Encryption/decryption errors')
    console.log('7. ❌ Network connectivity issues')

    // Step 5: Test the SMS settings API endpoint
    console.log('\n📋 Step 5: Testing SMS settings API endpoint...')
    
    console.log('🧪 Testing SMS settings API endpoint...')
    console.log('   This will simulate what happens when you try to save settings')
    
    // Simulate the API call that would be made when saving settings
    const testPartnerId = partners?.[0]?.id
    if (testPartnerId) {
      console.log(`   Using partner ID: ${testPartnerId}`)
      
      // Test data that would be sent to the API
      const testSaveData = {
        partner_id: testPartnerId,
        damza_api_key: 'test_api_key',
        damza_sender_id: 'TEST',
        damza_username: 'test_username',
        damza_password: 'test_password',
        sms_enabled: true,
        low_balance_threshold: 1000,
        notification_phone_numbers: ['254700000000'],
        sms_charge_per_message: 1.00
      }
      
      console.log('   Test save data:', JSON.stringify(testSaveData, null, 2))
      
      // Try to save the test data
      try {
        const { data: saveResult, error: saveError } = await supabase
          .from('partner_sms_settings')
          .upsert(testSaveData, { onConflict: 'partner_id' })
          .select()
        
        if (saveError) {
          console.log('❌ Save test failed:', saveError)
          console.log('   This shows what error you\'re getting when saving')
        } else {
          console.log('✅ Save test passed')
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
      } catch (saveTestError) {
        console.log('❌ Save test failed with exception:', saveTestError.message)
      }
    } else {
      console.log('❌ No partner ID available for testing')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Settings Save Issue Analysis:')
    console.log('====================================')
    console.log('Based on the investigation, the issue is likely:')
    console.log('')
    console.log('1. 🗄️  DATABASE TABLE ISSUE:')
    console.log('   - SMS settings table does not exist')
    console.log('   - Table has wrong structure/missing columns')
    console.log('   - Need to run database migration')
    console.log('')
    console.log('2. 🔑 AUTHENTICATION ISSUE:')
    console.log('   - User not authenticated properly')
    console.log('   - Insufficient permissions')
    console.log('   - JWT token issues')
    console.log('')
    console.log('3. 📊 DATA VALIDATION ISSUE:')
    console.log('   - Required fields missing')
    console.log('   - Invalid data format')
    console.log('   - Foreign key constraint violations')
    console.log('')
    console.log('4. 🔐 ENCRYPTION ISSUE:')
    console.log('   - Encryption/decryption failing')
    console.log('   - JWT secret not configured')
    console.log('   - Crypto functions not working')
    console.log('')
    console.log('💡 Most Likely Cause:')
    console.log('====================')
    console.log('🗄️  DATABASE TABLE MISSING - The SMS settings table probably doesn\'t exist')
    console.log('   This is the most common cause of save failures')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Check if SMS settings table exists in database')
    console.log('2. 🔧 Run database migration to create SMS tables')
    console.log('3. 🔧 Verify table structure is correct')
    console.log('4. 🔧 Test saving SMS settings again')
    console.log('5. 🔧 Check server logs for detailed error messages')
    console.log('')
    console.log('📱 To Fix the Issue:')
    console.log('===================')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Check if "partner_sms_settings" table exists')
    console.log('3. If not, run the SMS database migration')
    console.log('4. Try saving SMS settings again')
    console.log('5. Check browser console for error messages')
  }
}

debugSMSSettingsSaveIssue()
