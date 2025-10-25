// Debug script to investigate SMS sending status issues
// Run this script to understand why campaigns show as failed

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSSendingStatus() {
  console.log('🔍 SMS Sending Status Debug')
  console.log('===========================\n')

  try {
    // Test 1: Check recent campaigns and their status
    console.log('📋 Test 1: Checking recent campaigns...')
    
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
      console.log(`   Recipients: ${campaign.recipient_list?.length || 0}`)
      console.log(`   Cost: ${campaign.total_cost} KES`)
      console.log(`   Created: ${campaign.created_at}`)
    })

    // Test 2: Check SMS notifications for failed campaigns
    console.log('\n📋 Test 2: Checking SMS notifications...')
    
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
          console.log(`      Message: ${notif.message_content?.substring(0, 50)}...`)
          console.log(`      Created: ${notif.created_at}`)
        })
      }
    }

    // Test 3: Check partner SMS settings
    console.log('\n📋 Test 3: Checking partner SMS settings...')
    
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
        console.log(`   API Key: ${setting.damza_api_key ? 'Set' : 'Not set'}`)
        console.log(`   Username: ${setting.damza_username ? 'Set' : 'Not set'}`)
        console.log(`   Password: ${setting.damza_password ? 'Set' : 'Not set'}`)
      })
    }

    // Test 4: Test the Damza API endpoint (simulation)
    console.log('\n📋 Test 4: Testing Damza API simulation...')
    
    try {
      const testResponse = await fetch('https://api.damza.com/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_key'
        },
        body: JSON.stringify({
          username: 'test',
          password: 'test',
          sender_id: 'TestSender',
          phone_number: '254700000000',
          message: 'Test message'
        })
      })

      console.log(`   API Response Status: ${testResponse.status}`)
      
      if (testResponse.status === 404) {
        console.log('❌ Damza API endpoint not found (404)')
        console.log('💡 This explains why SMS sending fails - the API endpoint is not real')
      } else if (testResponse.status === 401) {
        console.log('⚠️ Damza API requires authentication (401)')
        console.log('💡 This is expected - the API exists but needs proper credentials')
      } else {
        console.log(`   API Response: ${testResponse.status}`)
      }
    } catch (error) {
      console.log('❌ Damza API test failed:', error.message)
      console.log('💡 This confirms the API endpoint is not accessible')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Sending Status Analysis:')
    console.log('===============================')
    console.log('The "failed" status is likely caused by:')
    console.log('1. ❌ Damza API endpoint is not real or accessible')
    console.log('2. ❌ SMS credentials are not properly configured')
    console.log('3. ❌ All SMS sends fail, making the campaign status "failed"')
    
    console.log('\n💡 Solutions:')
    console.log('=============')
    console.log('1. 🔧 Configure real Damza API credentials')
    console.log('2. 🔧 Update the API endpoint to a working SMS service')
    console.log('3. 🔧 Implement a test mode that simulates successful SMS sending')
    console.log('4. 🔧 Add better error handling and logging')
    
    console.log('\n📝 Next Steps:')
    console.log('==============')
    console.log('1. Check if you have real Damza API credentials')
    console.log('2. Update the SMS sending function with correct API endpoint')
    console.log('3. Test with a working SMS service or implement simulation mode')
    console.log('4. Monitor the server logs for detailed error messages')
  }
}

debugSMSSendingStatus()
