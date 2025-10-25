// Debug script to investigate SMS campaign failure
// This script will check the campaign status, SMS notifications, and API responses

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSCampaignFailure() {
  console.log('🔍 Debugging SMS Campaign Failure')
  console.log('=================================\n')

  try {
    // Step 1: Check recent campaigns and their status
    console.log('📋 Step 1: Checking recent SMS campaigns...')
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (campaignsError) {
      console.log('❌ Error fetching campaigns:', campaignsError)
      return
    }

    console.log(`✅ Found ${campaigns?.length || 0} recent campaigns`)
    
    campaigns?.forEach((campaign, index) => {
      console.log(`\n📊 Campaign ${index + 1}:`)
      console.log(`   Name: ${campaign.campaign_name}`)
      console.log(`   Status: ${campaign.status}`)
      console.log(`   Partner: ${campaign.partners?.name}`)
      console.log(`   Recipients: ${campaign.recipient_list?.length || 0}`)
      console.log(`   Cost: ${campaign.total_cost || 0} KES`)
      console.log(`   Created: ${campaign.created_at}`)
      console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
    })

    // Step 2: Check SMS notifications for failed campaigns
    console.log('\n📋 Step 2: Checking SMS notifications...')
    
    const { data: notifications, error: notificationsError } = await supabase
      .from('sms_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (notificationsError) {
      console.log('❌ Error fetching notifications:', notificationsError)
    } else {
      console.log(`✅ Found ${notifications?.length || 0} SMS notifications`)
      
      const statusCounts = notifications?.reduce((acc, notif) => {
        acc[notif.status] = (acc[notif.status] || 0) + 1
        return acc
      }, {}) || {}

      console.log('📊 Status breakdown:')
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })

      // Show sample failed notifications
      const failedNotifications = notifications?.filter(n => n.status === 'failed').slice(0, 3)
      if (failedNotifications && failedNotifications.length > 0) {
        console.log('\n❌ Sample failed notifications:')
        failedNotifications.forEach((notif, index) => {
          console.log(`   ${index + 1}. Phone: ${notif.recipient_phone}`)
          console.log(`      Status: ${notif.status}`)
          console.log(`      Message: ${notif.message_content?.substring(0, 50)}...`)
          console.log(`      Error: ${notif.error_message || 'No error message'}`)
          console.log(`      Created: ${notif.created_at}`)
        })
      }
    }

    // Step 3: Check partner SMS settings
    console.log('\n📋 Step 3: Checking partner SMS settings...')
    
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
    } else {
      console.log(`✅ Found ${smsSettings?.length || 0} SMS settings`)
      
      smsSettings?.forEach((setting, index) => {
        console.log(`\n📊 SMS Settings ${index + 1}:`)
        console.log(`   Partner: ${setting.partners?.name}`)
        console.log(`   Sender ID: ${setting.damza_sender_id}`)
        console.log(`   SMS Enabled: ${setting.sms_enabled}`)
        console.log(`   Cost per SMS: ${setting.sms_charge_per_message} KES`)
        console.log(`   API Key: ${setting.damza_api_key ? 'Set (encrypted)' : 'Not set'}`)
        console.log(`   Username: ${setting.damza_username ? 'Set (encrypted)' : 'Not set'}`)
        console.log(`   Password: ${setting.damza_password ? 'Set (encrypted)' : 'Not set'}`)
      })
    }

    // Step 4: Test the AirTouch API endpoint
    console.log('\n📋 Step 4: Testing AirTouch API endpoint...')
    
    const testPhone = '254700000000'
    const testMessage = 'Test message from Payment Vault System'
    const testSenderId = 'TestSender'
    const apiUrl = 'http://client.airtouch.co.ke:9012/sms/api/'
    
    const requestBody = {
      issn: testSenderId,
      msisdn: testPhone,
      text: testMessage,
      username: 'test_username',
      password: 'test_password',
      sms_id: `TEST_${Date.now()}`
    }

    console.log('📱 Testing AirTouch API:')
    console.log(`   URL: ${apiUrl}`)
    console.log(`   Sender ID: ${testSenderId}`)
    console.log(`   Phone: ${testPhone}`)
    console.log(`   Message: ${testMessage}`)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log(`   Response Status: ${response.status}`)
      console.log(`   Response Data:`, JSON.stringify(data, null, 2))

      if (response.ok && data.status_code === '1000') {
        console.log('✅ AirTouch API call successful!')
      } else {
        console.log(`❌ AirTouch API returned error: ${data.status_desc || 'Unknown error'}`)
      }
    } catch (apiError) {
      console.log('❌ AirTouch API call failed:', apiError.message)
    }

    // Step 5: Check if we're in test mode
    console.log('\n📋 Step 5: Checking test mode status...')
    
    const testModeIndicators = [
      '***encrypted***',
      'test',
      'TestSender',
      'test_username',
      'test_password'
    ]

    console.log('🧪 Test Mode Indicators:')
    smsSettings?.forEach((setting, index) => {
      const isTestMode = testModeIndicators.some(indicator => 
        setting.damza_api_key?.includes(indicator) ||
        setting.damza_username?.includes(indicator) ||
        setting.damza_password?.includes(indicator) ||
        setting.damza_sender_id?.includes(indicator)
      )
      
      console.log(`   Partner ${index + 1} (${setting.partners?.name}): ${isTestMode ? 'TEST MODE' : 'PRODUCTION MODE'}`)
    })

    // Step 6: Check server logs (simulate)
    console.log('\n📋 Step 6: Checking for common failure causes...')
    
    console.log('🔍 Common SMS Campaign Failure Causes:')
    console.log('=====================================')
    console.log('1. ❌ Invalid API credentials')
    console.log('2. ❌ Incorrect phone number format')
    console.log('3. ❌ Invalid sender ID')
    console.log('4. ❌ API endpoint not accessible')
    console.log('5. ❌ Insufficient account balance')
    console.log('6. ❌ Network connectivity issues')
    console.log('7. ❌ Test mode with invalid test credentials')

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Campaign Failure Analysis:')
    console.log('=================================')
    console.log('Based on the investigation, the most likely causes are:')
    console.log('')
    console.log('1. 🧪 TEST MODE: If credentials contain "***encrypted***" or "test"')
    console.log('   - SMS sending is simulated but may not work properly')
    console.log('   - Need to configure real AirTouch credentials')
    console.log('')
    console.log('2. 🔑 INVALID CREDENTIALS: If using real credentials but they\'re wrong')
    console.log('   - Check AirTouch account username and password')
    console.log('   - Verify sender ID is registered with AirTouch')
    console.log('   - Ensure account has sufficient balance')
    console.log('')
    console.log('3. 📱 PHONE NUMBER FORMAT: If phone numbers are not in correct format')
    console.log('   - Should be in format: 254XXXXXXXXX (12 digits)')
    console.log('   - No spaces, dashes, or plus signs')
    console.log('')
    console.log('4. 🌐 API CONNECTIVITY: If AirTouch API is not accessible')
    console.log('   - Check network connection')
    console.log('   - Verify API endpoint is correct')
    console.log('   - Check if AirTouch service is operational')
    
    console.log('\n💡 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Configure real AirTouch credentials in SMS settings')
    console.log('2. 🔧 Test with a real phone number')
    console.log('3. 🔧 Check AirTouch account balance')
    console.log('4. 🔧 Verify sender ID is registered')
    console.log('5. 🔧 Monitor server logs for detailed error messages')
    console.log('6. 🔧 Test API connectivity manually')
  }
}

debugSMSCampaignFailure()
