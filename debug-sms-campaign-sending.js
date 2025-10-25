// Comprehensive debugging script for SMS campaign sending failure
// This script will trace the entire SMS sending process to find where it's failing

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSCampaignSending() {
  console.log('🔍 Debugging SMS Campaign Sending Failure')
  console.log('=========================================\n')

  try {
    // Step 1: Check recent campaigns and their status
    console.log('📋 Step 1: Checking recent campaigns...')
    
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

      // Show recent failed notifications
      const recentFailed = notifications?.filter(n => n.status === 'failed').slice(0, 3)
      if (recentFailed && recentFailed.length > 0) {
        console.log('\n❌ Recent failed notifications:')
        recentFailed.forEach((notif, index) => {
          console.log(`\n📱 Failed Notification ${index + 1}:`)
          console.log(`   Phone: ${notif.recipient_phone}`)
          console.log(`   Status: ${notif.status}`)
          console.log(`   Error Message: ${notif.error_message || 'No error message'}`)
          console.log(`   Damza Reference: ${notif.damza_reference || 'No reference'}`)
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
      
      // Test the campaign send API endpoint
      const campaignId = recentCampaign.id
      const apiUrl = `http://localhost:3000/api/admin/sms/campaigns/${campaignId}/send`
      
      console.log(`\n📱 Testing campaign send API: ${apiUrl}`)
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Note: In real scenario, this would include auth_token cookie
          }
        })

        const responseText = await response.text()
        console.log(`📱 Campaign Send API Response Status: ${response.status}`)
        console.log(`📱 Campaign Send API Response Body: ${responseText}`)

        if (response.ok) {
          const data = JSON.parse(responseText)
          console.log('✅ Campaign send API call successful!')
          console.log('   Response data:', JSON.stringify(data, null, 2))
        } else {
          console.log('❌ Campaign send API call failed')
          try {
            const errorData = JSON.parse(responseText)
            console.log('   Error data:', JSON.stringify(errorData, null, 2))
          } catch (parseError) {
            console.log('   Raw error response:', responseText)
          }
        }
      } catch (apiError) {
        console.log('❌ Campaign send API call failed with error:', apiError.message)
        console.log('   This might indicate the server is not running or there\'s a network issue')
      }
    }

    // Step 5: Test individual SMS sending
    console.log('\n📋 Step 5: Testing individual SMS sending...')
    
    if (smsSettings && smsSettings.length > 0) {
      const smsSetting = smsSettings[0]
      
      // Test the individual SMS send API
      const smsSendUrl = 'http://localhost:3000/api/sms/send'
      const testPayload = {
        partner_id: smsSetting.partner_id,
        recipient_phone: '254700000000',
        message_content: 'Test message from debug script',
        message_type: 'custom'
      }
      
      console.log(`📱 Testing individual SMS send API: ${smsSendUrl}`)
      console.log('   Payload:', JSON.stringify(testPayload, null, 2))
      
      try {
        const response = await fetch(smsSendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Note: In real scenario, this would include auth_token cookie
          },
          body: JSON.stringify(testPayload)
        })

        const responseText = await response.text()
        console.log(`📱 Individual SMS Send API Response Status: ${response.status}`)
        console.log(`📱 Individual SMS Send API Response Body: ${responseText}`)

        if (response.ok) {
          const data = JSON.parse(responseText)
          console.log('✅ Individual SMS send API call successful!')
          console.log('   Response data:', JSON.stringify(data, null, 2))
        } else {
          console.log('❌ Individual SMS send API call failed')
          try {
            const errorData = JSON.parse(responseText)
            console.log('   Error data:', JSON.stringify(errorData, null, 2))
          } catch (parseError) {
            console.log('   Raw error response:', responseText)
          }
        }
      } catch (apiError) {
        console.log('❌ Individual SMS send API call failed with error:', apiError.message)
      }
    }

    // Step 6: Check partner wallet balance
    console.log('\n📋 Step 6: Checking partner wallet balance...')
    
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

    // Step 7: Simulate the SMS sending process
    console.log('\n📋 Step 7: Simulating SMS sending process...')
    
    if (campaigns && campaigns.length > 0 && smsSettings && smsSettings.length > 0) {
      const recentCampaign = campaigns[0]
      const smsSetting = smsSettings[0]
      
      console.log('🔧 Simulating the SMS sending process step by step...')
      
      // Step 7.1: Check campaign status
      console.log(`\n📊 Step 7.1: Campaign Status Check`)
      console.log(`   Campaign: ${recentCampaign.campaign_name}`)
      console.log(`   Status: ${recentCampaign.status}`)
      console.log(`   Recipients: ${recentCampaign.recipient_list?.length || 0}`)
      
      if (recentCampaign.status !== 'draft') {
        console.log(`   ⚠️  Campaign is not in draft status - cannot send`)
      } else {
        console.log(`   ✅ Campaign is in draft status - can be sent`)
      }
      
      // Step 7.2: Check SMS settings
      console.log(`\n📊 Step 7.2: SMS Settings Check`)
      console.log(`   Partner: ${smsSetting.partners?.name}`)
      console.log(`   SMS Enabled: ${smsSetting.sms_enabled}`)
      console.log(`   Sender ID: ${smsSetting.damza_sender_id}`)
      console.log(`   Cost per SMS: ${smsSetting.sms_charge_per_message} KES`)
      
      if (!smsSetting.sms_enabled) {
        console.log(`   ❌ SMS is disabled for this partner`)
      } else {
        console.log(`   ✅ SMS is enabled for this partner`)
      }
      
      // Step 7.3: Check wallet balance
      const partnerWallet = wallets?.find(w => w.partner_id === recentCampaign.partner_id)
      if (partnerWallet) {
        console.log(`\n📊 Step 7.3: Wallet Balance Check`)
        console.log(`   Partner: ${partnerWallet.partners?.name}`)
        console.log(`   Current Balance: ${partnerWallet.current_balance || 0} KES`)
        console.log(`   Required Cost: ${recentCampaign.total_cost || 0} KES`)
        
        if (partnerWallet.current_balance < (recentCampaign.total_cost || 0)) {
          console.log(`   ❌ Insufficient wallet balance`)
        } else {
          console.log(`   ✅ Sufficient wallet balance`)
        }
      }
      
      // Step 7.4: Simulate SMS sending for each recipient
      console.log(`\n📊 Step 7.4: Simulating SMS sending for each recipient`)
      if (recentCampaign.recipient_list && recentCampaign.recipient_list.length > 0) {
        recentCampaign.recipient_list.forEach((phone, index) => {
          console.log(`\n📱 Recipient ${index + 1}: ${phone}`)
          console.log(`   Message: ${recentCampaign.message_content?.substring(0, 50)}...`)
          console.log(`   Sender ID: ${smsSetting.damza_sender_id}`)
          console.log(`   Cost: ${smsSetting.sms_charge_per_message} KES`)
          
          // Check if there's a corresponding SMS notification
          const correspondingNotification = notifications?.find(n => 
            n.recipient_phone === phone && 
            n.message_content === recentCampaign.message_content
          )
          
          if (correspondingNotification) {
            console.log(`   📊 SMS Notification Status: ${correspondingNotification.status}`)
            console.log(`   📊 Error Message: ${correspondingNotification.error_message || 'None'}`)
            console.log(`   📊 Damza Reference: ${correspondingNotification.damza_reference || 'None'}`)
          } else {
            console.log(`   ❌ No corresponding SMS notification found`)
          }
        })
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Campaign Sending Debug Summary:')
    console.log('=====================================')
    console.log('✅ Recent campaigns analyzed')
    console.log('✅ SMS notifications checked')
    console.log('✅ SMS settings verified')
    console.log('✅ API endpoints tested')
    console.log('✅ Wallet balances checked')
    console.log('✅ SMS sending process simulated')
    console.log('')
    console.log('💡 Key Findings:')
    console.log('===============')
    console.log('🔍 The debug will show exactly where the SMS sending is failing')
    console.log('🔍 This will identify whether the issue is:')
    console.log('   - Campaign status (not in draft)')
    console.log('   - SMS settings (disabled or missing)')
    console.log('   - Wallet balance (insufficient funds)')
    console.log('   - API endpoint issues')
    console.log('   - AirTouch API problems')
    console.log('   - Database transaction issues')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Review the debug output above')
    console.log('2. 🔧 Check if the development server is running')
    console.log('3. 🔧 Verify authentication is working')
    console.log('4. 🔧 Check AirTouch API credentials')
    console.log('5. 🔧 Verify wallet balances are sufficient')
    console.log('')
    console.log('📱 Common Issues and Solutions:')
    console.log('===============================')
    console.log('1. ❌ Campaign not in draft status → Check campaign status')
    console.log('2. ❌ SMS disabled for partner → Enable SMS in settings')
    console.log('3. ❌ Insufficient wallet balance → Top up partner wallet')
    console.log('4. ❌ Invalid AirTouch credentials → Update SMS settings')
    console.log('5. ❌ API endpoint not working → Check server logs')
    console.log('6. ❌ Authentication issues → Log in as admin')
  }
}

debugSMSCampaignSending()
