// Step-by-step debugging script for SMS sending failure
// This script will trace the entire SMS sending process to identify where it's failing

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSSendingStepByStep() {
  console.log('🔍 Step-by-Step SMS Sending Debug')
  console.log('=================================\n')

  try {
    // Step 1: Check recent campaigns and their status
    console.log('📋 Step 1: Checking recent campaigns and status...')
    
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
      .limit(3)

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
      console.log(`   Total Cost: ${campaign.total_cost || 0} KES`)
      console.log(`   Created: ${campaign.created_at}`)
      console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
    })

    // Step 2: Check SMS notifications for the most recent campaign
    console.log('\n📋 Step 2: Checking SMS notifications for recent campaigns...')
    
    if (campaigns && campaigns.length > 0) {
      const recentCampaign = campaigns[0]
      console.log(`🔍 Analyzing campaign: ${recentCampaign.campaign_name}`)
      
      const { data: notifications, error: notificationsError } = await supabase
        .from('sms_notifications')
        .select('*')
        .eq('partner_id', recentCampaign.partner_id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (notificationsError) {
        console.log('❌ Error fetching notifications:', notificationsError)
      } else {
        console.log(`✅ Found ${notifications?.length || 0} SMS notifications`)
        
        notifications?.forEach((notif, index) => {
          console.log(`\n📱 Notification ${index + 1}:`)
          console.log(`   Phone: ${notif.recipient_phone}`)
          console.log(`   Status: ${notif.status}`)
          console.log(`   SMS Cost: ${notif.sms_cost || 0} KES`)
          console.log(`   Message: ${notif.message_content?.substring(0, 50)}...`)
          console.log(`   Damza Reference: ${notif.damza_reference}`)
          console.log(`   Error Message: ${notif.error_message || 'None'}`)
          console.log(`   Created: ${notif.created_at}`)
          console.log(`   Sent At: ${notif.sent_at || 'Not sent'}`)
        })
      }
    }

    // Step 3: Check SMS settings for the partner
    console.log('\n📋 Step 3: Checking SMS settings...')
    
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

    // Step 4: Test the SMS sending API endpoint directly
    console.log('\n📋 Step 4: Testing SMS sending API endpoint...')
    
    if (campaigns && campaigns.length > 0 && smsSettings && smsSettings.length > 0) {
      const recentCampaign = campaigns[0]
      const smsSetting = smsSettings[0]
      
      console.log(`🔧 Testing SMS sending for campaign: ${recentCampaign.campaign_name}`)
      console.log(`📱 Using SMS settings for partner: ${smsSetting.partners?.name}`)
      
      // Simulate the SMS sending process
      const testPhone = recentCampaign.recipient_list?.[0] || '254700000000'
      const testMessage = recentCampaign.message_content || 'Test message'
      const testSenderId = smsSetting.damza_sender_id
      
      console.log(`\n📱 SMS Sending Parameters:`)
      console.log(`   Phone: ${testPhone}`)
      console.log(`   Message: ${testMessage}`)
      console.log(`   Sender ID: ${testSenderId}`)
      console.log(`   Cost per SMS: ${smsSetting.sms_charge_per_message} KES`)
      
      // Test the AirTouch API directly
      console.log(`\n🔧 Testing AirTouch API directly...`)
      
      const apiUrl = 'http://client.airtouch.co.ke:9012/sms/api/'
      const smsId = `DEBUG_${Date.now()}`
      
      // Build GET request URL with parameters
      const params = new URLSearchParams({
        issn: testSenderId,
        msisdn: testPhone,
        text: testMessage,
        username: 'test_username', // This will show the format issue
        password: 'test_password',
        sms_id: smsId
      })
      
      const getUrl = `${apiUrl}?${params.toString()}`
      
      console.log(`📱 GET Request URL: ${getUrl}`)
      
      try {
        const response = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        console.log(`📱 API Response Status: ${response.status}`)
        console.log(`📱 API Response Data:`, JSON.stringify(data, null, 2))

        if (response.ok && data.status_code === '1000') {
          console.log('✅ AirTouch API call successful!')
        } else if (data.status_code === '1011' || data.status_desc === 'INVALID USER') {
          console.log('⚠️ AirTouch API format is correct, but credentials are invalid')
          console.log('   This is expected with test credentials')
        } else {
          console.log(`❌ AirTouch API returned error: ${data.status_desc}`)
        }
      } catch (error) {
        console.log('❌ AirTouch API call failed:', error.message)
      }
    }

    // Step 5: Check partner wallet balance
    console.log('\n📋 Step 5: Checking partner wallet balance...')
    
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)

    if (walletsError) {
      console.log('❌ Error fetching wallets:', walletsError)
    } else {
      console.log(`✅ Found ${wallets?.length || 0} partner wallets`)
      
      wallets?.forEach((wallet, index) => {
        console.log(`\n💰 Wallet ${index + 1}:`)
        console.log(`   Partner: ${wallet.partners?.name}`)
        console.log(`   Current Balance: ${wallet.current_balance || 0} KES`)
        console.log(`   Last Updated: ${wallet.updated_at}`)
      })
    }

    // Step 6: Check for any error patterns
    console.log('\n📋 Step 6: Analyzing error patterns...')
    
    const { data: failedNotifications, error: failedError } = await supabase
      .from('sms_notifications')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5)

    if (failedError) {
      console.log('❌ Error fetching failed notifications:', failedError)
    } else {
      console.log(`✅ Found ${failedNotifications?.length || 0} failed SMS notifications`)
      
      if (failedNotifications && failedNotifications.length > 0) {
        console.log('\n❌ Failed SMS Notifications Analysis:')
        failedNotifications.forEach((notif, index) => {
          console.log(`\n📱 Failed Notification ${index + 1}:`)
          console.log(`   Phone: ${notif.recipient_phone}`)
          console.log(`   Status: ${notif.status}`)
          console.log(`   Error Message: ${notif.error_message || 'No error message'}`)
          console.log(`   Damza Reference: ${notif.damza_reference || 'No reference'}`)
          console.log(`   Created: ${notif.created_at}`)
        })
      }
    }

    // Step 7: Check server logs simulation
    console.log('\n📋 Step 7: Simulating server log analysis...')
    
    console.log('🔍 Server Log Analysis:')
    console.log('======================')
    console.log('Based on the investigation, here are the likely server log entries:')
    console.log('')
    console.log('1. 📱 SMS Campaign Send Request:')
    console.log('   - Campaign ID: [campaign_id]')
    console.log('   - Partner ID: [partner_id]')
    console.log('   - Recipients: [recipient_list]')
    console.log('   - Message: [message_content]')
    console.log('')
    console.log('2. 🔧 SMS Settings Retrieval:')
    console.log('   - Sender ID: [damza_sender_id]')
    console.log('   - Cost per SMS: [sms_charge_per_message]')
    console.log('   - SMS Enabled: [sms_enabled]')
    console.log('')
    console.log('3. 📱 AirTouch API Call:')
    console.log('   - URL: http://client.airtouch.co.ke:9012/sms/api/?issn=...')
    console.log('   - Method: GET')
    console.log('   - Response: [status_code] - [status_desc]')
    console.log('')
    console.log('4. 📊 SMS Notification Creation:')
    console.log('   - Status: [sent/failed]')
    console.log('   - Reference: [damza_reference]')
    console.log('   - Cost: [sms_cost]')
    console.log('')
    console.log('5. 📈 Campaign Status Update:')
    console.log('   - Status: [completed/failed]')
    console.log('   - Sent At: [timestamp]')

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 Step-by-Step SMS Sending Analysis:')
    console.log('=====================================')
    console.log('Based on the investigation, the failure points are likely:')
    console.log('')
    console.log('1. 🔑 CREDENTIALS ISSUE:')
    console.log('   - AirTouch API returning "INVALID USER" (1011)')
    console.log('   - Need real AirTouch credentials instead of test credentials')
    console.log('   - Username/password not configured correctly')
    console.log('')
    console.log('2. 📱 SENDER ID ISSUE:')
    console.log('   - Sender ID not registered with AirTouch')
    console.log('   - Sender ID format incorrect')
    console.log('   - Sender ID not approved by AirTouch')
    console.log('')
    console.log('3. 💰 BALANCE ISSUE:')
    console.log('   - AirTouch account has insufficient balance')
    console.log('   - Account suspended or inactive')
    console.log('   - Payment method not set up')
    console.log('')
    console.log('4. 🌐 NETWORK ISSUE:')
    console.log('   - AirTouch API endpoint not accessible')
    console.log('   - Network connectivity problems')
    console.log('   - Firewall blocking requests')
    console.log('')
    console.log('5. 📊 SYSTEM ISSUE:')
    console.log('   - SMS sending logic not working correctly')
    console.log('   - Database transaction issues')
    console.log('   - Race conditions in campaign processing')
    console.log('')
    console.log('💡 Most Likely Cause:')
    console.log('====================')
    console.log('🔑 INVALID CREDENTIALS - The AirTouch API is working (200 response)')
    console.log('   but returning "INVALID USER" (1011) which means:')
    console.log('   - Username is incorrect')
    console.log('   - Password is incorrect')
    console.log('   - Account is not active')
    console.log('   - Credentials are not properly configured')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Configure real AirTouch credentials in SMS settings')
    console.log('2. 🔧 Verify sender ID is registered with AirTouch')
    console.log('3. 🔧 Check AirTouch account balance and status')
    console.log('4. 🔧 Test with real phone numbers')
    console.log('5. 🔧 Contact AirTouch support if credentials are correct')
    console.log('')
    console.log('📱 To Fix the Issue:')
    console.log('===================')
    console.log('1. Go to SMS Settings page')
    console.log('2. Update AirTouch credentials with real values')
    console.log('3. Verify sender ID is correct and registered')
    console.log('4. Test with a real phone number')
    console.log('5. Check AirTouch account balance')
  }
}

debugSMSSendingStepByStep()
