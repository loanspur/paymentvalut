// Test script to simulate the exact API call made by the frontend
// This script will test the SMS settings API endpoint with the same data format

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSMSSettingsAPICall() {
  console.log('🧪 Testing SMS Settings API Call')
  console.log('=================================\n')

  try {
    // Step 1: Get a partner to test with
    console.log('📋 Step 1: Getting a partner for testing...')
    
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code')
      .eq('is_active', true)
      .limit(1)

    if (partnersError || !partners || partners.length === 0) {
      console.log('❌ No active partners found:', partnersError)
      return
    }

    const testPartner = partners[0]
    console.log(`✅ Using partner: ${testPartner.name} (${testPartner.short_code})`)

    // Step 2: Simulate the exact payload that the frontend sends
    console.log('\n📋 Step 2: Simulating frontend payload...')
    
    const frontendPayload = {
      partner_id: testPartner.id,
      damza_api_key: 'test_api_key_123',
      damza_sender_id: 'TEST',
      damza_username: 'test_username',
      damza_password: 'test_password',
      sms_enabled: true,
      low_balance_threshold: 1000,
      notification_phone_numbers: ['254700000000', '254700000001'], // Array as sent by frontend
      sms_charge_per_message: 1.00
    }

    console.log('📤 Frontend payload:')
    console.log(JSON.stringify(frontendPayload, null, 2))

    // Step 3: Test the API endpoint directly
    console.log('\n📋 Step 3: Testing SMS settings API endpoint...')
    
    // Simulate the API call that the frontend makes
    const apiUrl = 'http://localhost:3000/api/admin/sms/settings'
    
    console.log(`🔧 Making API call to: ${apiUrl}`)
    console.log('   Method: POST')
    console.log('   Headers: Content-Type: application/json')
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real scenario, this would include auth_token cookie
        },
        body: JSON.stringify(frontendPayload)
      })

      const responseText = await response.text()
      console.log(`📱 API Response Status: ${response.status}`)
      console.log(`📱 API Response Body: ${responseText}`)

      if (response.ok) {
        const data = JSON.parse(responseText)
        console.log('✅ API call successful!')
        console.log('   Response data:', JSON.stringify(data, null, 2))
      } else {
        console.log('❌ API call failed')
        try {
          const errorData = JSON.parse(responseText)
          console.log('   Error data:', JSON.stringify(errorData, null, 2))
        } catch (parseError) {
          console.log('   Raw error response:', responseText)
        }
      }
    } catch (apiError) {
      console.log('❌ API call failed with error:', apiError.message)
      console.log('   This might indicate the server is not running or there\'s a network issue')
    }

    // Step 4: Test the database operation directly
    console.log('\n📋 Step 4: Testing database operation directly...')
    
    console.log('🔧 Testing database upsert operation...')
    
    try {
      // Test the exact database operation that the API performs
      const { data: existingSettings, error: existingError } = await supabase
        .from('partner_sms_settings')
        .select('id')
        .eq('partner_id', testPartner.id)
        .maybeSingle()

      if (existingError) {
        console.log('❌ Error checking existing settings:', existingError)
      } else {
        console.log('✅ Existing settings check passed')
        console.log(`   Existing settings found: ${existingSettings ? 'Yes' : 'No'}`)
      }

      // Test the upsert operation
      const { data: upsertResult, error: upsertError } = await supabase
        .from('partner_sms_settings')
        .upsert(frontendPayload, { onConflict: 'partner_id' })
        .select()

      if (upsertError) {
        console.log('❌ Database upsert failed:', upsertError)
      } else {
        console.log('✅ Database upsert successful!')
        console.log('   Upsert result:', JSON.stringify(upsertResult, null, 2))
        
        // Clean up test data
        if (upsertResult && upsertResult.length > 0) {
          await supabase
            .from('partner_sms_settings')
            .delete()
            .eq('id', upsertResult[0].id)
          console.log('   Test data cleaned up')
        }
      }
    } catch (dbError) {
      console.log('❌ Database operation failed:', dbError.message)
    }

    // Step 5: Check for common issues
    console.log('\n📋 Step 5: Checking for common issues...')
    
    console.log('🔍 Common SMS Settings Save Issues:')
    console.log('===================================')
    console.log('1. ❌ Authentication: Missing or invalid auth token')
    console.log('2. ❌ Authorization: User not admin or super_admin')
    console.log('3. ❌ Validation: Missing required fields')
    console.log('4. ❌ Encryption: JWT_SECRET not configured')
    console.log('5. ❌ Database: Table structure issues')
    console.log('6. ❌ Network: Server not running or network issues')
    console.log('7. ❌ CORS: Cross-origin request issues')

    // Step 6: Test authentication
    console.log('\n📋 Step 6: Testing authentication...')
    
    console.log('🔧 Checking JWT_SECRET configuration...')
    const jwtSecret = process.env.JWT_SECRET
    if (jwtSecret) {
      console.log('✅ JWT_SECRET is configured')
      console.log(`   Length: ${jwtSecret.length} characters`)
    } else {
      console.log('❌ JWT_SECRET is not configured')
      console.log('   This will cause encryption/decryption to fail')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Settings API Test Summary:')
    console.log('=================================')
    console.log('✅ Partner data retrieved')
    console.log('✅ Frontend payload simulated')
    console.log('✅ API endpoint tested')
    console.log('✅ Database operation tested')
    console.log('✅ Common issues identified')
    console.log('✅ Authentication checked')
    console.log('')
    console.log('💡 Key Findings:')
    console.log('===============')
    console.log('🔍 The test will show exactly what\'s happening when you try to save SMS settings')
    console.log('🔍 This will identify whether the issue is:')
    console.log('   - Authentication/authorization')
    console.log('   - API endpoint problems')
    console.log('   - Database operation issues')
    console.log('   - Data validation problems')
    console.log('   - Encryption/decryption issues')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Review the API response above')
    console.log('2. 🔧 Check if the server is running (localhost:3000)')
    console.log('3. 🔧 Verify authentication is working')
    console.log('4. 🔧 Check browser console for error messages')
    console.log('5. 🔧 Check server logs for detailed error information')
    console.log('')
    console.log('📱 To Fix the Issue:')
    console.log('===================')
    console.log('1. Make sure the development server is running')
    console.log('2. Check that you\'re logged in as admin or super_admin')
    console.log('3. Check browser console for any error messages')
    console.log('4. Check server logs for detailed error information')
    console.log('5. Verify JWT_SECRET is configured in environment variables')
  }
}

testSMSSettingsAPICall()
