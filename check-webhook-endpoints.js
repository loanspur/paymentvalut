// Check webhook endpoints configuration and accessibility
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWebhookEndpoints() {
  try {
    console.log('🔍 Checking Webhook Endpoints...');
    console.log('================================');
    
    // Step 1: Check environment variables for webhook URLs
    console.log('🌐 Step 1: Checking webhook environment variables...');
    const webhookUrl = process.env.USSD_WEBHOOK_URL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    console.log('Environment Variables:');
    console.log(`  USSD_WEBHOOK_URL: ${webhookUrl || 'NOT SET'}`);
    console.log(`  SUPABASE_URL: ${supabaseUrl || 'NOT SET'}`);
    console.log('');
    
    // Step 2: Construct expected webhook endpoints
    console.log('🔗 Step 2: Expected webhook endpoints...');
    const expectedEndpoints = {
      'USSD to Payment Vault': `${supabaseUrl}/functions/v1/disburse`,
      'Mifos Webhook': `${supabaseUrl}/functions/v1/mifos-webhook/loan-approval`,
      'M-Pesa Result Callback': `${supabaseUrl}/functions/v1/mpesa-b2c-result`,
      'M-Pesa Timeout Callback': `${supabaseUrl}/functions/v1/mpesa-b2c-timeout`,
      'Payment Vault to USSD': webhookUrl || 'NOT CONFIGURED'
    };
    
    console.log('Expected Endpoints:');
    Object.entries(expectedEndpoints).forEach(([name, url]) => {
      console.log(`  ${name}: ${url}`);
    });
    console.log('');
    
    // Step 3: Check if webhook logs table exists
    console.log('📋 Step 3: Checking webhook logs table...');
    const { data: webhookLogs, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .limit(1);
    
    if (webhookError) {
      console.log('❌ webhook_logs table does not exist:', webhookError.message);
      console.log('   This means webhook calls are not being logged');
    } else {
      console.log('✅ webhook_logs table exists');
    }
    console.log('');
    
    // Step 4: Check for any webhook-related tables
    console.log('🗄️ Step 4: Checking for webhook-related data...');
    
    // Check mpesa_callbacks table
    const { data: mpesaCallbacks, error: mpesaError } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .limit(3);
    
    if (mpesaError) {
      console.log('❌ mpesa_callbacks table error:', mpesaError.message);
    } else if (mpesaCallbacks && mpesaCallbacks.length > 0) {
      console.log(`✅ Found ${mpesaCallbacks.length} M-Pesa callback records:`);
      mpesaCallbacks.forEach((callback, index) => {
        console.log(`  ${index + 1}. Type: ${callback.callback_type}`);
        console.log(`     Result Code: ${callback.result_code}`);
        console.log(`     Result Desc: ${callback.result_desc}`);
        console.log(`     Created: ${callback.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No M-Pesa callback records found');
    }
    
    // Step 5: Check recent disbursements for webhook activity
    console.log('📤 Step 5: Checking recent disbursements for webhook activity...');
    const { data: recentDisbursements, error: disbError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('origin', 'ussd')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (disbError) {
      console.log('❌ Error fetching disbursements:', disbError.message);
    } else if (recentDisbursements && recentDisbursements.length > 0) {
      console.log(`✅ Found ${recentDisbursements.length} recent USSD disbursements:`);
      recentDisbursements.forEach((disb, index) => {
        console.log(`  ${index + 1}. ID: ${disb.id}`);
        console.log(`     Phone: ${disb.msisdn}`);
        console.log(`     Amount: KES ${disb.amount}`);
        console.log(`     Status: ${disb.status}`);
        console.log(`     Created: ${disb.created_at}`);
        console.log(`     Client Request ID: ${disb.client_request_id || 'None'}`);
        console.log('');
      });
    }
    
    // Step 6: Test webhook endpoint accessibility
    console.log('🧪 Step 6: Testing webhook endpoint accessibility...');
    
    if (supabaseUrl) {
      const testEndpoint = `${supabaseUrl}/functions/v1/disburse`;
      console.log(`Testing endpoint: ${testEndpoint}`);
      
      try {
        const response = await fetch(testEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            amount: 100,
            msisdn: '254700000000',
            tenant_id: 'TEST',
            customer_id: 'TEST123',
            client_request_id: `TEST_${Date.now()}`
          })
        });
        
        const responseText = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response: ${responseText.substring(0, 200)}...`);
        
        if (response.status === 200 || response.status === 400) {
          console.log('✅ Webhook endpoint is accessible');
        } else {
          console.log('⚠️ Webhook endpoint returned unexpected status');
        }
      } catch (error) {
        console.log('❌ Webhook endpoint test failed:', error.message);
      }
    } else {
      console.log('❌ Cannot test webhook endpoint - SUPABASE_URL not set');
    }
    console.log('');
    
    // Step 7: Check partner webhook configurations
    console.log('🏢 Step 7: Checking partner webhook configurations...');
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
        console.log(`     Webhook URL: ${partner.webhook_url || 'NOT SET'}`);
        console.log(`     Has Credentials: ${partner.consumer_key ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    console.log('Webhook Configuration Status:');
    console.log('');
    
    // Analysis
    if (!webhookUrl) {
      console.log('❌ ISSUE: USSD_WEBHOOK_URL not configured');
      console.log('   The system cannot send callbacks to USSD backend');
    } else {
      console.log('✅ USSD_WEBHOOK_URL is configured');
    }
    
    if (!supabaseUrl) {
      console.log('❌ ISSUE: SUPABASE_URL not configured');
      console.log('   Cannot construct webhook endpoints');
    } else {
      console.log('✅ SUPABASE_URL is configured');
    }
    
    if (webhookError) {
      console.log('❌ ISSUE: webhook_logs table missing');
      console.log('   Webhook calls are not being logged for debugging');
    } else {
      console.log('✅ webhook_logs table exists');
    }
    
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. **For USSD Team**: Use this endpoint to send loan requests:');
    console.log(`   POST ${supabaseUrl}/functions/v1/disburse`);
    console.log('');
    console.log('2. **Required Headers**:');
    console.log('   x-api-key: [YOUR_API_KEY]');
    console.log('   Content-Type: application/json');
    console.log('');
    console.log('3. **Required Payload**:');
    console.log('   {');
    console.log('     "amount": 1200,');
    console.log('     "msisdn": "2547XXXXXXXX",');
    console.log('     "tenant_id": "KULMNA_TENANT",');
    console.log('     "customer_id": "CUST456",');
    console.log('     "client_request_id": "KULMNA-2025-01-09-000123"');
    console.log('   }');
    console.log('');
    console.log('4. **For Callbacks**: Configure USSD_WEBHOOK_URL environment variable');
    console.log('   so the system can send transaction status updates back to USSD');
    
  } catch (error) {
    console.error('❌ Webhook check failed:', error);
  }
}

checkWebhookEndpoints();

