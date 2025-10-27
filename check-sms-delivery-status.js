// Check SMS delivery status from database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSMSDeliveryStatus() {
  try {
    console.log('🔍 Checking SMS Delivery Status...');
    console.log('=====================================');
    
    // Check recent SMS notifications
    console.log('📱 Recent SMS Notifications (last 10):');
    const { data: recentSMS, error: smsError } = await supabase
      .from('sms_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (smsError) {
      console.log('❌ Error fetching SMS notifications:', smsError.message);
    } else if (recentSMS && recentSMS.length > 0) {
      console.log('✅ Found', recentSMS.length, 'recent SMS notifications:');
      recentSMS.forEach((sms, index) => {
        console.log(`  ${index + 1}. Phone: ${sms.recipient_phone}`);
        console.log(`     Status: ${sms.status}`);
        console.log(`     Type: ${sms.message_type}`);
        console.log(`     Sender ID: ${sms.damza_sender_id}`);
        console.log(`     Reference: ${sms.damza_reference}`);
        console.log(`     Created: ${sms.created_at}`);
        console.log(`     Message: ${sms.message_content?.substring(0, 50)}...`);
        console.log('');
      });
    } else {
      console.log('❌ No SMS notifications found in database');
    }
    
    // Check recent SMS campaigns
    console.log('📱 Recent SMS Campaigns (last 5):');
    const { data: recentCampaigns, error: campaignError } = await supabase
      .from('sms_bulk_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (campaignError) {
      console.log('❌ Error fetching SMS campaigns:', campaignError.message);
    } else if (recentCampaigns && recentCampaigns.length > 0) {
      console.log('✅ Found', recentCampaigns.length, 'recent SMS campaigns:');
      recentCampaigns.forEach((campaign, index) => {
        console.log(`  ${index + 1}. Campaign: ${campaign.campaign_name}`);
        console.log(`     Status: ${campaign.status}`);
        console.log(`     Recipients: ${campaign.recipient_list?.length || 0}`);
        console.log(`     Sent: ${campaign.sent_count || 0}`);
        console.log(`     Delivered: ${campaign.delivered_count || 0}`);
        console.log(`     Failed: ${campaign.failed_count || 0}`);
        console.log(`     Created: ${campaign.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No SMS campaigns found in database');
    }
    
    // Check if there are any successful SMS deliveries
    const { data: successfulSMS, error: successError } = await supabase
      .from('sms_notifications')
      .select('*')
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (successError) {
      console.log('❌ Error fetching successful SMS:', successError.message);
    } else if (successfulSMS && successfulSMS.length > 0) {
      console.log('✅ Found', successfulSMS.length, 'successful SMS deliveries:');
      successfulSMS.forEach((sms, index) => {
        console.log(`  ${index + 1}. Phone: ${sms.recipient_phone}`);
        console.log(`     Sender ID: ${sms.damza_sender_id}`);
        console.log(`     Reference: ${sms.damza_reference}`);
        console.log(`     Sent: ${sms.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No successful SMS deliveries found');
      console.log('This suggests that SMS campaigns might not be working either.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSMSDeliveryStatus();


