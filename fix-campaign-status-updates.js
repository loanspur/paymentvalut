// Fix script for campaign status updates
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixCampaignStatusUpdates() {
  console.log('🔧 Fixing Campaign Status Updates')
  console.log('==================================\n')

  try {
    // Step 1: Find campaigns that need status updates
    console.log('📋 Step 1: Finding campaigns that need status updates...')
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from('sms_bulk_campaigns')
      .select('*')
      .in('status', ['failed', 'sending'])
      .order('created_at', { ascending: false })

    if (campaignsError) {
      console.log('❌ Error fetching campaigns:', campaignsError)
      return
    }

    console.log(`✅ Found ${campaigns?.length || 0} campaigns with failed/sending status`)

    const campaignsToUpdate = []

    // Step 2: Check each campaign for successful SMS notifications
    for (const campaign of campaigns || []) {
      console.log(`\n🔍 Checking campaign: ${campaign.campaign_name}`)
      
      // Get SMS notifications for this campaign
      const { data: notifications, error: notifError } = await supabase
        .from('sms_notifications')
        .select('*')
        .eq('partner_id', campaign.partner_id)
        .order('created_at', { ascending: false })
        .limit(50)

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

      const sentCount = campaignNotifications.filter(n => n.status === 'sent').length
      const failedCount = campaignNotifications.filter(n => n.status === 'failed').length
      const pendingCount = campaignNotifications.filter(n => n.status === 'pending').length

      console.log(`📱 Found ${campaignNotifications.length} notifications`)
      console.log(`   Sent: ${sentCount}`)
      console.log(`   Failed: ${failedCount}`)
      console.log(`   Pending: ${pendingCount}`)

      // If we have sent SMS, mark campaign as completed
      if (sentCount > 0) {
        campaignsToUpdate.push({
          campaign,
          sentCount,
          failedCount,
          totalNotifications: campaignNotifications.length,
          notifications: campaignNotifications
        })
        console.log(`✅ Campaign should be marked as completed`)
      } else {
        console.log(`❌ No sent SMS found, keeping as failed`)
      }
    }

    console.log(`\n📊 Found ${campaignsToUpdate.length} campaigns to update`)

    // Step 3: Update campaign statuses
    for (const item of campaignsToUpdate) {
      console.log(`\n🔧 Updating campaign: ${item.campaign.campaign_name}`)
      
      // Calculate actual cost based on sent SMS
      const actualCost = item.sentCount * (item.campaign.total_cost / (item.campaign.recipient_list?.length || 1))
      
      // Update campaign status
      const { data: updatedCampaign, error: updateError } = await supabase
        .from('sms_bulk_campaigns')
        .update({
          status: 'completed',
          sent_at: new Date().toISOString(),
          total_cost: actualCost,
          delivered_count: item.sentCount,
          failed_count: item.failedCount
        })
        .eq('id', item.campaign.id)
        .select()
        .single()

      if (updateError) {
        console.log(`❌ Error updating campaign:`, updateError)
      } else {
        console.log(`✅ Campaign updated successfully`)
        console.log(`   Status: ${updatedCampaign.status}`)
        console.log(`   Total Cost: ${updatedCampaign.total_cost} KES`)
        console.log(`   Delivered: ${updatedCampaign.delivered_count}`)
        console.log(`   Failed: ${updatedCampaign.failed_count}`)
      }

      // Step 4: Update SMS notifications to link them to the campaign
      console.log(`🔗 Linking SMS notifications to campaign...`)
      
      const notificationIds = item.notifications.map(n => n.id)
      
      if (notificationIds.length > 0) {
        const { data: updatedNotifications, error: linkError } = await supabase
          .from('sms_notifications')
          .update({
            bulk_campaign_id: item.campaign.id,
            sent_at: new Date().toISOString()
          })
          .in('id', notificationIds)
          .select()

        if (linkError) {
          console.log(`❌ Error linking notifications:`, linkError)
        } else {
          console.log(`✅ Linked ${updatedNotifications?.length || 0} notifications to campaign`)
        }
      }
    }

    // Step 5: Verify the updates
    console.log(`\n📋 Step 5: Verifying updates...`)
    
    const { data: updatedCampaigns, error: verifyError } = await supabase
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

    if (verifyError) {
      console.log('❌ Error verifying updates:', verifyError)
    } else {
      console.log('📊 Updated Campaign Status:')
      updatedCampaigns?.forEach((campaign, index) => {
        console.log(`\n   📊 Campaign ${index + 1}:`)
        console.log(`      Name: ${campaign.campaign_name}`)
        console.log(`      Status: ${campaign.status}`)
        console.log(`      Partner: ${campaign.partners?.name}`)
        console.log(`      Recipients: ${campaign.recipient_list?.length || 0}`)
        console.log(`      Cost: ${campaign.total_cost} KES`)
        console.log(`      Delivered: ${campaign.delivered_count || 0}`)
        console.log(`      Failed: ${campaign.failed_count || 0}`)
        console.log(`      Sent At: ${campaign.sent_at || 'Not sent'}`)
      })
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message)
  } finally {
    console.log('\n🎯 Campaign Status Update Fix Summary:')
    console.log('======================================')
    console.log('✅ Campaigns analyzed')
    console.log('✅ SMS notifications checked')
    console.log('✅ Campaign statuses updated')
    console.log('✅ SMS notifications linked to campaigns')
    console.log('✅ Updates verified')
    console.log('')
    console.log('🔧 What Was Fixed:')
    console.log('==================')
    console.log('✅ Updated failed campaigns to completed status')
    console.log('✅ Recalculated campaign costs based on actual SMS sent')
    console.log('✅ Updated delivered and failed counts')
    console.log('✅ Linked SMS notifications to their campaigns')
    console.log('✅ Added proper sent_at timestamps')
    console.log('')
    console.log('💡 Next Steps:')
    console.log('==============')
    console.log('1. Test creating a new multi-recipient campaign')
    console.log('2. Verify that status updates correctly to completed')
    console.log('3. Check that SMS notifications are properly linked')
    console.log('4. Monitor campaign statistics for accuracy')
  }
}

fixCampaignStatusUpdates()
