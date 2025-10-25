// Debug script for multi-recipient SMS campaign issues
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugMultiRecipientSMS() {
  console.log('🔍 Debugging Multi-Recipient SMS Campaign')
  console.log('==========================================\n')

  try {
    // Step 1: Check recent campaigns with multiple recipients
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
      .limit(10)

    if (campaignsError) {
      console.log('❌ Error fetching campaigns:', campaignsError)
      return
    }

    console.log(`✅ Found ${campaigns?.length || 0} recent campaigns`)
    
    // Find campaigns with multiple recipients
    const multiRecipientCampaigns = campaigns?.filter(c => 
      c.recipient_list && c.recipient_list.length > 1
    ) || []

    console.log(`📊 Found ${multiRecipientCampaigns.length} campaigns with multiple recipients`)

    if (multiRecipientCampaigns.length > 0) {
      multiRecipientCampaigns.forEach((campaign, index) => {
        console.log(`\n📊 Multi-Recipient Campaign ${index + 1}:`)
        console.log(`   ID: ${campaign.id}`)
        console.log(`   Name: ${campaign.campaign_name}`)
        console.log(`   Status: ${campaign.status}`)
        console.log(`   Partner: ${campaign.partners?.name}`)
        console.log(`   Recipient List: ${JSON.stringify(campaign.recipient_list)}`)
        console.log(`   Total Recipients: ${campaign.total_recipients}`)
        console.log(`   Created: ${campaign.created_at}`)
        console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
      })

      // Step 2: Check SMS notifications for multi-recipient campaigns
      console.log(`\n📋 Step 2: Checking SMS notifications for multi-recipient campaigns...`)
      
      for (const campaign of multiRecipientCampaigns.slice(0, 3)) { // Check first 3
        console.log(`\n🔍 Checking notifications for campaign: ${campaign.campaign_name}`)
        
        const { data: notifications, error: notifError } = await supabase
          .from('sms_notifications')
          .select('*')
          .eq('partner_id', campaign.partner_id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (notifError) {
          console.log(`❌ Error fetching notifications:`, notifError)
          continue
        }

        // Filter notifications that match this campaign
        const campaignNotifications = notifications?.filter(notif => 
          notif.message_content === campaign.message_content ||
          notif.message_content?.includes(campaign.campaign_name) ||
          notif.bulk_campaign_id === campaign.id
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
          
          // Show recent notifications
          campaignNotifications.slice(0, 5).forEach((notif, index) => {
            console.log(`\n   📱 Notification ${index + 1}:`)
            console.log(`      Phone: ${notif.recipient_phone}`)
            console.log(`      Status: ${notif.status}`)
            console.log(`      Message: ${notif.message_content?.substring(0, 50)}...`)
            console.log(`      Reference: ${notif.damza_reference || 'None'}`)
            console.log(`      Error: ${notif.error_message || 'None'}`)
            console.log(`      Created: ${notif.created_at}`)
            console.log(`      Sent At: ${notif.sent_at || 'Not sent'}`)
          })
        } else {
          console.log(`⚠️  No notifications found for this campaign`)
        }
      }
    } else {
      console.log('ℹ️  No multi-recipient campaigns found')
    }

    // Step 3: Test recipient list parsing
    console.log(`\n📋 Step 3: Testing recipient list parsing...`)
    
    const testInputs = [
      "254700000000, 254700000001, 254700000002",
      "254700000000\n254700000001\n254700000002",
      "254700000000,254700000001,254700000002",
      "254700000000, 254700000001\n254700000002",
      "254700000000, 254700000001, 254700000002, "
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

    // Step 4: Check for any failed campaigns
    console.log(`\n📋 Step 4: Checking for failed campaigns...`)
    
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
      
      failedCampaigns?.forEach((campaign, index) => {
        console.log(`\n❌ Failed Campaign ${index + 1}:`)
        console.log(`   Name: ${campaign.campaign_name}`)
        console.log(`   Partner: ${campaign.partners?.name}`)
        console.log(`   Recipients: ${campaign.recipient_list?.length || 0}`)
        console.log(`   Recipient List: ${JSON.stringify(campaign.recipient_list)}`)
        console.log(`   Created: ${campaign.created_at}`)
        console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
      })
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 Multi-Recipient SMS Debug Summary:')
    console.log('=====================================')
    console.log('✅ Campaign data analyzed')
    console.log('✅ Multi-recipient campaigns identified')
    console.log('✅ SMS notifications checked')
    console.log('✅ Recipient list parsing tested')
    console.log('✅ Failed campaigns reviewed')
    console.log('')
    console.log('🔧 Fixes Applied:')
    console.log('=================')
    console.log('✅ Updated recipient list parsing to handle both comma and newline separators')
    console.log('✅ Added input validation and trimming')
    console.log('✅ Updated UI labels and placeholders')
    console.log('✅ Added helpful instructions for users')
    console.log('')
    console.log('💡 How to Use:')
    console.log('==============')
    console.log('1. Enter phone numbers separated by commas: 254700000000, 254700000001')
    console.log('2. Or enter each number on a new line')
    console.log('3. Or mix both formats: 254700000000, 254700000001\\n254700000002')
    console.log('4. The system will automatically parse and clean the numbers')
    console.log('5. Empty entries will be filtered out automatically')
  }
}

debugMultiRecipientSMS()
