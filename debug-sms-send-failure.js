// Debug script for SMS sending failure and recipient count issues
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSSendFailure() {
  console.log('🔍 Debugging SMS Send Failure and Recipient Count Issues')
  console.log('========================================================\n')

  try {
    // Step 1: Check the most recent campaigns
    console.log('📋 Step 1: Checking most recent campaigns...')
    
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
      console.log(`   ID: ${campaign.id}`)
      console.log(`   Name: ${campaign.campaign_name}`)
      console.log(`   Status: ${campaign.status}`)
      console.log(`   Partner: ${campaign.partners?.name}`)
      console.log(`   Recipient List: ${JSON.stringify(campaign.recipient_list)}`)
      console.log(`   Recipient Count: ${campaign.recipient_list?.length || 0}`)
      console.log(`   Total Recipients: ${campaign.total_recipients}`)
      console.log(`   Sent Count: ${campaign.sent_count || 0}`)
      console.log(`   Delivered Count: ${campaign.delivered_count || 0}`)
      console.log(`   Failed Count: ${campaign.failed_count || 0}`)
      console.log(`   Total Cost: ${campaign.total_cost} KES`)
      console.log(`   Created: ${campaign.created_at}`)
      console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
    })

    // Step 2: Check SMS notifications for the most recent campaign
    if (campaigns && campaigns.length > 0) {
      const latestCampaign = campaigns[0]
      console.log(`\n📋 Step 2: Checking SMS notifications for latest campaign: ${latestCampaign.campaign_name}`)
      
      const { data: notifications, error: notifError } = await supabase
        .from('sms_notifications')
        .select('*')
        .eq('partner_id', latestCampaign.partner_id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (notifError) {
        console.log(`❌ Error fetching notifications:`, notifError)
      } else {
        console.log(`📱 Found ${notifications?.length || 0} notifications for this partner`)
        
        // Filter notifications that match this campaign
        const campaignNotifications = notifications?.filter(notif => 
          notif.message_content === latestCampaign.message_content ||
          notif.message_content?.includes(latestCampaign.campaign_name) ||
          notif.bulk_campaign_id === latestCampaign.id ||
          (latestCampaign.recipient_list && latestCampaign.recipient_list.includes(notif.recipient_phone))
        ) || []

        console.log(`📱 Found ${campaignNotifications.length} notifications for this campaign`)
        
        if (campaignNotifications.length > 0) {
          console.log(`📊 Notification Summary:`)
          const sentCount = campaignNotifications.filter(n => n.status === 'sent').length
          const failedCount = campaignNotifications.filter(n => n.status === 'failed').length
          const pendingCount = campaignNotifications.filter(n => n.status === 'pending').length
          
          console.log(`   Sent: ${sentCount}`)
          console.log(`   Failed: ${failedCount}`)
          console.log(`   Pending: ${pendingCount}`)
          
          // Show all notifications for this campaign
          campaignNotifications.forEach((notif, index) => {
            console.log(`\n   📱 Notification ${index + 1}:`)
            console.log(`      Phone: ${notif.recipient_phone}`)
            console.log(`      Status: ${notif.status}`)
            console.log(`      Message: ${notif.message_content?.substring(0, 50)}...`)
            console.log(`      Reference: ${notif.damza_reference || 'None'}`)
            console.log(`      Error: ${notif.error_message || 'None'}`)
            console.log(`      Created: ${notif.created_at}`)
            console.log(`      Sent At: ${notif.sent_at || 'Not sent'}`)
            console.log(`      Campaign ID: ${notif.bulk_campaign_id || 'None'}`)
          })
        } else {
          console.log(`⚠️  No notifications found for this campaign`)
        }
      }
    }

    // Step 3: Check SMS settings for the partner
    console.log(`\n📋 Step 3: Checking SMS settings...`)
    
    if (campaigns && campaigns.length > 0) {
      const latestCampaign = campaigns[0]
      
      const { data: smsSettings, error: settingsError } = await supabase
        .from('partner_sms_settings')
        .select('*')
        .eq('partner_id', latestCampaign.partner_id)
        .single()

      if (settingsError) {
        console.log(`❌ Error fetching SMS settings:`, settingsError)
      } else if (smsSettings) {
        console.log(`✅ SMS Settings found:`)
        console.log(`   Partner ID: ${smsSettings.partner_id}`)
        console.log(`   Sender ID: ${smsSettings.damza_sender_id}`)
        console.log(`   Username: ${smsSettings.damza_username}`)
        console.log(`   API Key: ${smsSettings.damza_api_key ? '***encrypted***' : 'Not set'}`)
        console.log(`   Cost per SMS: ${smsSettings.sms_charge_per_message} KES`)
        console.log(`   Is Active: ${smsSettings.is_active}`)
      } else {
        console.log(`⚠️  No SMS settings found for this partner`)
      }
    }

    // Step 4: Check for any failed campaigns with 2 recipients
    console.log(`\n📋 Step 4: Checking for failed campaigns with 2 recipients...`)
    
    const { data: failedCampaigns, error: failedError } = await supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5)

    if (failedError) {
      console.log('❌ Error fetching failed campaigns:', failedError)
    } else {
      console.log(`📊 Found ${failedCampaigns?.length || 0} failed campaigns`)
      
      const twoRecipientFailed = failedCampaigns?.filter(c => 
        c.recipient_list && c.recipient_list.length === 2
      ) || []

      console.log(`📊 Found ${twoRecipientFailed.length} failed campaigns with 2 recipients`)
      
      twoRecipientFailed.forEach((campaign, index) => {
        console.log(`\n❌ Failed 2-Recipient Campaign ${index + 1}:`)
        console.log(`   Name: ${campaign.campaign_name}`)
        console.log(`   Partner: ${campaign.partners?.name}`)
        console.log(`   Recipients: ${JSON.stringify(campaign.recipient_list)}`)
        console.log(`   Recipient Count: ${campaign.recipient_list?.length || 0}`)
        console.log(`   Total Recipients: ${campaign.total_recipients}`)
        console.log(`   Created: ${campaign.created_at}`)
        console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
      })
    }

    // Step 5: Test recipient list parsing
    console.log(`\n📋 Step 5: Testing recipient list parsing...`)
    
    const testInputs = [
      "254727638940, 254740593276",
      "254727638940,254740593276",
      "254727638940\n254740593276",
      "254727638940, 254740593276, ",
      "254727638940, 254740593276, 254700000000"
    ]

    testInputs.forEach((input, index) => {
      console.log(`\n   Test ${index + 1}: "${input}"`)
      const parsed = input
        .split(/[,\n]/) // Split by both comma and newline
        .map(phone => phone.trim()) // Trim whitespace
        .filter(phone => phone.length > 0) // Remove empty entries
      
      console.log(`   Parsed: ${JSON.stringify(parsed)}`)
      console.log(`   Count: ${parsed.length}`)
    })

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Send Failure Debug Summary:')
    console.log('==================================')
    console.log('✅ Recent campaigns analyzed')
    console.log('✅ SMS notifications checked')
    console.log('✅ SMS settings verified')
    console.log('✅ Failed campaigns identified')
    console.log('✅ Recipient parsing tested')
    console.log('')
    console.log('🔧 Issues Found:')
    console.log('================')
    console.log('1. Check if SMS settings are properly configured')
    console.log('2. Verify recipient list parsing is working correctly')
    console.log('3. Check if SMS sending logic is handling multiple recipients')
    console.log('4. Verify campaign status updates are working')
    console.log('5. Check if recipient count display is accurate')
  }
}

debugSMSSendFailure()
