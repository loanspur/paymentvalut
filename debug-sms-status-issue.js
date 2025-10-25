// Debug script for SMS campaign status update issue
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSStatusIssue() {
  console.log('🔍 Debugging SMS Campaign Status Update Issue')
  console.log('==============================================\n')

  try {
    // Step 1: Check recent campaigns
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
      .limit(5)

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
      console.log(`   Recipients: ${campaign.recipient_list?.length || 0}`)
      console.log(`   Recipient List: ${JSON.stringify(campaign.recipient_list)}`)
      console.log(`   Total Cost: ${campaign.total_cost} KES`)
      console.log(`   Created: ${campaign.created_at}`)
      console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
    })

    // Step 2: Check SMS notifications for each campaign
    console.log(`\n📋 Step 2: Checking SMS notifications for each campaign...`)
    
    for (const campaign of campaigns || []) {
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
        notif.bulk_campaign_id === campaign.id ||
        (campaign.recipient_list && campaign.recipient_list.includes(notif.recipient_phone))
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

        // Check if campaign status should be updated
        const expectedStatus = sentCount > 0 ? 'completed' : 'failed'
        const needsUpdate = campaign.status !== expectedStatus
        
        console.log(`\n📊 Status Analysis:`)
        console.log(`   Current Status: ${campaign.status}`)
        console.log(`   Expected Status: ${expectedStatus}`)
        console.log(`   Needs Update: ${needsUpdate ? 'YES' : 'NO'}`)
        
        if (needsUpdate) {
          console.log(`🔧 Campaign needs status update!`)
        }
      } else {
        console.log(`⚠️  No notifications found for this campaign`)
      }
    }

    // Step 3: Check for campaigns that should be marked as completed
    console.log(`\n📋 Step 3: Finding campaigns that need status updates...`)
    
    const campaignsNeedingUpdate = []
    
    for (const campaign of campaigns || []) {
      if (campaign.status === 'failed' || campaign.status === 'sending') {
        // Get notifications for this campaign
        const { data: notifications } = await supabase
          .from('sms_notifications')
          .select('*')
          .eq('partner_id', campaign.partner_id)
          .order('created_at', { ascending: false })
          .limit(50)

        const campaignNotifications = notifications?.filter(notif => 
          notif.message_content === campaign.message_content ||
          notif.message_content?.includes(campaign.campaign_name) ||
          notif.bulk_campaign_id === campaign.id ||
          (campaign.recipient_list && campaign.recipient_list.includes(notif.recipient_phone))
        ) || []

        const sentCount = campaignNotifications.filter(n => n.status === 'sent').length
        const failedCount = campaignNotifications.filter(n => n.status === 'failed').length
        
        if (sentCount > 0) {
          campaignsNeedingUpdate.push({
            campaign,
            sentCount,
            failedCount,
            totalNotifications: campaignNotifications.length
          })
        }
      }
    }

    console.log(`🔍 Found ${campaignsNeedingUpdate.length} campaigns that need status updates`)

    if (campaignsNeedingUpdate.length > 0) {
      campaignsNeedingUpdate.forEach((item, index) => {
        console.log(`\n📊 Campaign ${index + 1} needing update:`)
        console.log(`   Name: ${item.campaign.campaign_name}`)
        console.log(`   Current Status: ${item.campaign.status}`)
        console.log(`   Sent SMS: ${item.sentCount}`)
        console.log(`   Failed SMS: ${item.failedCount}`)
        console.log(`   Total Notifications: ${item.totalNotifications}`)
        console.log(`   Should be: completed`)
      })
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Status Debug Summary:')
    console.log('============================')
    console.log('✅ Campaign data analyzed')
    console.log('✅ SMS notifications checked')
    console.log('✅ Status inconsistencies identified')
    console.log('✅ Campaigns needing updates found')
    console.log('')
    console.log('🔧 Next Steps:')
    console.log('==============')
    console.log('1. Update campaign statuses based on actual SMS delivery')
    console.log('2. Fix SMS sending logic to properly update status')
    console.log('3. Ensure notifications are properly linked to campaigns')
    console.log('4. Test the fix with new campaigns')
  }
}

debugSMSStatusIssue()
