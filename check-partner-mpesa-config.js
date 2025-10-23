const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPartnerMpesaConfig() {
  console.log('🔍 Checking Partner M-Pesa Configuration');
  console.log('========================================\n');

  const partnerName = 'Umoja Magharibi';

  // Get partner configuration
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('name', partnerName)
    .single();

  if (partnerError || !partner) {
    console.error('❌ Error fetching partner:', partnerError?.message || 'Partner not found');
    return;
  }

  console.log('📋 Partner Configuration:');
  console.log(`   Name: ${partner.name}`);
  console.log(`   ID: ${partner.id}`);
  console.log(`   Is Active: ${partner.is_active}`);
  console.log(`   API Key: ${partner.api_key ? 'Present' : 'Missing'}`);
  console.log(`   Tenant ID: ${partner.tenant_id || 'Missing'}`);
  console.log(`   M-Pesa Shortcode: ${partner.mpesa_shortcode || 'Missing'}`);
  console.log(`   M-Pesa Consumer Key: ${partner.mpesa_consumer_key ? 'Present' : 'Missing'}`);
  console.log(`   M-Pesa Consumer Secret: ${partner.mpesa_consumer_secret ? 'Present' : 'Missing'}`);
  console.log(`   M-Pesa Passkey: ${partner.mpesa_passkey ? 'Present' : 'Missing'}`);
  console.log(`   M-Pesa Environment: ${partner.mpesa_environment || 'Missing'}`);

  // Check what fields are missing
  const requiredFields = [
    'api_key',
    'tenant_id', 
    'mpesa_shortcode',
    'mpesa_consumer_key',
    'mpesa_consumer_secret',
    'mpesa_passkey',
    'mpesa_environment'
  ];

  const missingFields = requiredFields.filter(field => !partner[field]);
  
  if (missingFields.length > 0) {
    console.log('\n❌ Missing required M-Pesa configuration fields:');
    missingFields.forEach(field => {
      console.log(`   - ${field}`);
    });
    console.log('\n💡 Please configure these fields in the partner settings.');
  } else {
    console.log('\n✅ All required M-Pesa configuration fields are present!');
  }

  // Check if we can test the disbursement API directly
  if (partner.api_key && partner.tenant_id) {
    console.log('\n🧪 Testing disbursement API directly...');
    
    const testDisbursementData = {
      msisdn: '254727638941',
      amount: 100, // Small test amount
      tenant_id: partner.tenant_id,
      customer_id: 'test_customer',
      client_request_id: `test_${Date.now()}`
    };

    console.log('📤 Sending test disbursement request...');
    console.log('   Data:', testDisbursementData);
    
    try {
      const response = await fetch('http://localhost:3000/api/disburse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': partner.api_key
        },
        body: JSON.stringify(testDisbursementData)
      });

      console.log(`📡 Response Status: ${response.status}`);
      
      const responseData = await response.json();
      console.log('📥 Response Data:', responseData);
      
      if (response.ok) {
        console.log('✅ Disbursement API is working!');
      } else {
        console.log('❌ Disbursement API error:', responseData.error_message || responseData.message);
      }
    } catch (error) {
      console.error('❌ Error testing disbursement API:', error.message);
    }
  } else {
    console.log('\n⚠️ Cannot test disbursement API - missing required fields');
  }
}

checkPartnerMpesaConfig();

