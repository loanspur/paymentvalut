// Check current USSD status and recent activity
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentUSSDStatus() {
  try {
    console.log('🔍 Checking Current USSD Status...');
    console.log('==================================');
    
    // Check today's disbursements
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Checking disbursements for today (${today})...`);
    
    const { data: todayDisbursements, error: todayError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('origin', 'ussd')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .order('created_at', { ascending: false });
    
    if (todayError) {
      console.log('❌ Error fetching today\'s disbursements:', todayError.message);
    } else if (todayDisbursements && todayDisbursements.length > 0) {
      console.log(`✅ Found ${todayDisbursements.length} USSD disbursements today:`);
      
      const statusCounts = todayDisbursements.reduce((acc, disb) => {
        acc[disb.status] = (acc[disb.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Status Summary:', statusCounts);
      console.log('');
      
      // Show recent ones
      todayDisbursements.slice(0, 5).forEach((disb, index) => {
        console.log(`  ${index + 1}. Phone: ${disb.msisdn}`);
        console.log(`     Amount: KES ${disb.amount}`);
        console.log(`     Status: ${disb.status}`);
        console.log(`     Time: ${disb.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No USSD disbursements found today');
    }
    
    // Check last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`📅 Checking disbursements in last 24 hours...`);
    
    const { data: last24h, error: last24hError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('origin', 'ussd')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });
    
    if (last24hError) {
      console.log('❌ Error fetching last 24h disbursements:', last24hError.message);
    } else if (last24h && last24h.length > 0) {
      console.log(`✅ Found ${last24h.length} USSD disbursements in last 24 hours`);
      
      const statusCounts24h = last24h.reduce((acc, disb) => {
        acc[disb.status] = (acc[disb.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Last 24h Status Summary:', statusCounts24h);
      console.log('');
      
      // Group by hour to see activity pattern
      const hourlyActivity = last24h.reduce((acc, disb) => {
        const hour = new Date(disb.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Hourly Activity Pattern:');
      Object.entries(hourlyActivity)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([hour, count]) => {
          console.log(`  ${hour}:00 - ${count} disbursements`);
        });
      console.log('');
    } else {
      console.log('❌ No USSD disbursements found in last 24 hours');
    }
    
    // Check for any pending disbursements
    console.log('⏳ Checking for pending disbursements...');
    const { data: pending, error: pendingError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (pendingError) {
      console.log('❌ Error fetching pending disbursements:', pendingError.message);
    } else if (pending && pending.length > 0) {
      console.log(`⚠️ Found ${pending.length} pending disbursements:`);
      pending.forEach((disb, index) => {
        console.log(`  ${index + 1}. Phone: ${disb.msisdn}`);
        console.log(`     Amount: KES ${disb.amount}`);
        console.log(`     Origin: ${disb.origin}`);
        console.log(`     Created: ${disb.created_at}`);
        console.log(`     Partner: ${disb.partner_id}`);
        console.log('');
      });
    } else {
      console.log('✅ No pending disbursements found');
    }
    
    // Check partner status
    console.log('🏢 Checking partner status...');
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true);
    
    if (partnerError) {
      console.log('❌ Error fetching partners:', partnerError.message);
    } else if (partners && partners.length > 0) {
      console.log(`✅ Found ${partners.length} active partners:`);
      partners.forEach((partner, index) => {
        console.log(`  ${index + 1}. ${partner.name}`);
        console.log(`     ID: ${partner.id}`);
        console.log(`     Short Code: ${partner.mpesa_shortcode}`);
        console.log(`     Environment: ${partner.mpesa_environment}`);
        console.log(`     Has Credentials: ${partner.consumer_key ? 'Yes' : 'No'}`);
        console.log(`     Has Initiator: ${partner.mpesa_initiator_name ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    console.log('Based on the current status:');
    console.log('');
    
    if (last24h && last24h.length > 0) {
      const successCount = last24h.filter(d => d.status === 'success').length;
      const failedCount = last24h.filter(d => d.status === 'failed').length;
      const pendingCount = last24h.filter(d => d.status === 'pending').length;
      
      console.log(`📊 Last 24 Hours Summary:`);
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);
      console.log(`   ⏳ Pending: ${pendingCount}`);
      console.log(`   📈 Success Rate: ${((successCount / last24h.length) * 100).toFixed(1)}%`);
      console.log('');
      
      if (pendingCount > 0) {
        console.log('⚠️ ISSUE: There are pending disbursements that may be queuing');
        console.log('   This could indicate:');
        console.log('   1. M-Pesa API issues');
        console.log('   2. Partner credential problems');
        console.log('   3. System processing delays');
      } else if (failedCount > 0) {
        console.log('⚠️ ISSUE: There are failed disbursements');
        console.log('   This could indicate:');
        console.log('   1. Invalid phone numbers');
        console.log('   2. M-Pesa account issues');
        console.log('   3. Insufficient B2C float');
      } else {
        console.log('✅ GOOD: All recent disbursements are successful');
      }
    } else {
      console.log('❌ ISSUE: No USSD activity in the last 24 hours');
      console.log('   This could indicate:');
      console.log('   1. USSD system is not sending requests');
      console.log('   2. Webhook integration is broken');
      console.log('   3. System is not processing requests');
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
}

checkCurrentUSSDStatus();



