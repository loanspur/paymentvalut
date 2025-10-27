// Check for incoming USSD loan requests and disbursement status
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUSSDLoanRequests() {
  try {
    console.log('🔍 Investigating USSD Loan Requests...');
    console.log('=====================================');
    
    // Step 1: Check for recent loan tracking records
    console.log('📋 Step 1: Checking recent loan tracking records...');
    const { data: loanTracking, error: loanError } = await supabase
      .from('loan_tracking')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (loanError) {
      console.log('❌ Error fetching loan tracking:', loanError.message);
    } else if (loanTracking && loanTracking.length > 0) {
      console.log(`✅ Found ${loanTracking.length} recent loan tracking records:`);
      loanTracking.forEach((loan, index) => {
        console.log(`  ${index + 1}. Loan ID: ${loan.loan_id}`);
        console.log(`     Client: ${loan.client_name} (${loan.phone_number})`);
        console.log(`     Amount: KES ${loan.loan_amount}`);
        console.log(`     Status: ${loan.status}`);
        console.log(`     Partner: ${loan.partner_id}`);
        console.log(`     Created: ${loan.created_at}`);
        console.log(`     Error: ${loan.error_message || 'None'}`);
        console.log('');
      });
    } else {
      console.log('❌ No recent loan tracking records found');
    }
    
    // Step 2: Check for recent disbursement requests
    console.log('💰 Step 2: Checking recent disbursement requests...');
    const { data: disbursements, error: disbError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (disbError) {
      console.log('❌ Error fetching disbursements:', disbError.message);
    } else if (disbursements && disbursements.length > 0) {
      console.log(`✅ Found ${disbursements.length} recent disbursement requests:`);
      disbursements.forEach((disb, index) => {
        console.log(`  ${index + 1}. ID: ${disb.id}`);
        console.log(`     Phone: ${disb.msisdn}`);
        console.log(`     Amount: KES ${disb.amount}`);
        console.log(`     Status: ${disb.status}`);
        console.log(`     Partner: ${disb.partner_id}`);
        console.log(`     Origin: ${disb.origin}`);
        console.log(`     Created: ${disb.created_at}`);
        console.log(`     Description: ${disb.description}`);
        console.log('');
      });
    } else {
      console.log('❌ No recent disbursement requests found');
    }
    
    // Step 3: Check for webhook logs
    console.log('🔗 Step 3: Checking webhook logs...');
    const { data: webhookLogs, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (webhookError) {
      console.log('❌ Error fetching webhook logs:', webhookError.message);
    } else if (webhookLogs && webhookLogs.length > 0) {
      console.log(`✅ Found ${webhookLogs.length} recent webhook logs:`);
      webhookLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. Source: ${log.source}`);
        console.log(`     Event: ${log.event_type}`);
        console.log(`     Status: ${log.status}`);
        console.log(`     Created: ${log.created_at}`);
        console.log(`     Payload: ${log.payload ? 'Present' : 'None'}`);
        console.log('');
      });
    } else {
      console.log('❌ No recent webhook logs found');
    }
    
    // Step 4: Check partner configurations
    console.log('🏢 Step 4: Checking partner configurations...');
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true);
    
    if (partnerError) {
      console.log('❌ Error fetching partners:', partnerError.message);
    } else if (partners && partners.length > 0) {
      console.log(`✅ Found ${partners.length} active partners:`);
      partners.forEach((partner, index) => {
        console.log(`  ${index + 1}. Name: ${partner.name}`);
        console.log(`     ID: ${partner.id}`);
        console.log(`     Short Code: ${partner.mpesa_shortcode}`);
        console.log(`     Environment: ${partner.mpesa_environment}`);
        console.log(`     Has Credentials: ${partner.consumer_key ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('❌ No active partners found');
    }
    
    // Step 5: Check auto disbursal configurations
    console.log('⚙️ Step 5: Checking auto disbursal configurations...');
    const { data: autoConfigs, error: configError } = await supabase
      .from('auto_disbursal_configs')
      .select('*');
    
    if (configError) {
      console.log('❌ Error fetching auto disbursal configs:', configError.message);
    } else if (autoConfigs && autoConfigs.length > 0) {
      console.log(`✅ Found ${autoConfigs.length} auto disbursal configurations:`);
      autoConfigs.forEach((config, index) => {
        console.log(`  ${index + 1}. Partner: ${config.partner_id}`);
        console.log(`     Product ID: ${config.loan_product_id}`);
        console.log(`     Min Amount: KES ${config.min_amount}`);
        console.log(`     Max Amount: KES ${config.max_amount}`);
        console.log(`     Enabled: ${config.is_enabled}`);
        console.log('');
      });
    } else {
      console.log('❌ No auto disbursal configurations found');
    }
    
    // Step 6: Check for any pending/failed transactions
    console.log('⚠️ Step 6: Checking for pending/failed transactions...');
    const { data: pendingDisb, error: pendingError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .in('status', ['pending', 'failed'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (pendingError) {
      console.log('❌ Error fetching pending disbursements:', pendingError.message);
    } else if (pendingDisb && pendingDisb.length > 0) {
      console.log(`⚠️ Found ${pendingDisb.length} pending/failed disbursements:`);
      pendingDisb.forEach((disb, index) => {
        console.log(`  ${index + 1}. ID: ${disb.id}`);
        console.log(`     Phone: ${disb.msisdn}`);
        console.log(`     Amount: KES ${disb.amount}`);
        console.log(`     Status: ${disb.status}`);
        console.log(`     Error: ${disb.error_message || 'None'}`);
        console.log(`     Created: ${disb.created_at}`);
        console.log('');
      });
    } else {
      console.log('✅ No pending/failed disbursements found');
    }
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    console.log('Based on the data above, here are the possible issues:');
    console.log('');
    console.log('1. **No Loan Tracking Records**: USSD system may not be sending loan requests');
    console.log('2. **No Webhook Logs**: Webhook integration may not be working');
    console.log('3. **No Auto Disbursal Configs**: Partners may not have auto-disbursement enabled');
    console.log('4. **Partner Configuration Issues**: Partners may not have proper credentials');
    console.log('5. **Pending/Failed Transactions**: System may be receiving requests but failing to process');
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. Check if USSD system is configured to send webhooks to Payment Vault');
    console.log('2. Verify partner auto-disbursal configurations');
    console.log('3. Check webhook endpoint accessibility');
    console.log('4. Review partner M-Pesa credentials');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

checkUSSDLoanRequests();



