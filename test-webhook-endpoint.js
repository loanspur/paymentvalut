// Test the webhook endpoint with proper authentication
require('dotenv').config();

async function testWebhookEndpoint() {
  try {
    console.log('🧪 Testing Webhook Endpoint...');
    console.log('==============================');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !apiKey) {
      console.log('❌ Missing required environment variables');
      return;
    }
    
    const webhookUrl = `${supabaseUrl}/functions/v1/disburse`;
    console.log(`Testing endpoint: ${webhookUrl}`);
    console.log('');
    
    // Test 1: Test with proper authentication
    console.log('🔐 Test 1: Testing with proper authentication...');
    const testPayload = {
      amount: 100,
      msisdn: '254700000000',
      tenant_id: 'TEST',
      customer_id: 'TEST123',
      client_request_id: `TEST_${Date.now()}`
    };
    
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    console.log('');
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(testPayload)
      });
      
      const responseText = await response.text();
      console.log(`Response Status: ${response.status}`);
      console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`Response Body: ${responseText}`);
      console.log('');
      
      if (response.status === 200) {
        console.log('✅ Webhook endpoint is working correctly');
      } else if (response.status === 400) {
        console.log('⚠️ Webhook endpoint is accessible but returned validation error');
        console.log('   This is expected for test data');
      } else {
        console.log('❌ Webhook endpoint returned unexpected status');
      }
    } catch (error) {
      console.log('❌ Webhook endpoint test failed:', error.message);
    }
    
    // Test 2: Test with real USSD payload format
    console.log('📱 Test 2: Testing with real USSD payload format...');
    const realPayload = {
      amount: 3000,
      msisdn: '254727638940',
      tenant_id: 'KULMNA_TENANT',
      customer_id: 'CUST456',
      client_request_id: `KULMNA-${new Date().toISOString().split('T')[0]}-${Date.now()}`
    };
    
    console.log('Real Payload:', JSON.stringify(realPayload, null, 2));
    console.log('');
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(realPayload)
      });
      
      const responseText = await response.text();
      console.log(`Response Status: ${response.status}`);
      console.log(`Response Body: ${responseText}`);
      console.log('');
      
      if (response.status === 200) {
        console.log('✅ Webhook endpoint accepted real USSD payload');
      } else if (response.status === 400) {
        console.log('⚠️ Webhook endpoint returned validation error for real payload');
        console.log('   This might indicate missing partner configuration');
      } else {
        console.log('❌ Webhook endpoint returned unexpected status for real payload');
      }
    } catch (error) {
      console.log('❌ Real payload test failed:', error.message);
    }
    
    // Test 3: Check what authentication methods are supported
    console.log('🔍 Test 3: Testing different authentication methods...');
    
    const authMethods = [
      { name: 'x-api-key only', headers: { 'x-api-key': apiKey } },
      { name: 'Authorization Bearer only', headers: { 'Authorization': `Bearer ${apiKey}` } },
      { name: 'Both headers', headers: { 'x-api-key': apiKey, 'Authorization': `Bearer ${apiKey}` } }
    ];
    
    for (const method of authMethods) {
      console.log(`Testing ${method.name}...`);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...method.headers
          },
          body: JSON.stringify(testPayload)
        });
        
        console.log(`  Status: ${response.status}`);
        if (response.status === 401) {
          console.log('  ❌ Authentication failed');
        } else if (response.status === 200 || response.status === 400) {
          console.log('  ✅ Authentication successful');
        } else {
          console.log('  ⚠️ Unexpected status');
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    console.log('');
    console.log('📋 SUMMARY:');
    console.log('===========');
    console.log('Webhook endpoint testing complete.');
    console.log('');
    console.log('For USSD team to send loan requests:');
    console.log(`1. Use endpoint: ${webhookUrl}`);
    console.log('2. Use authentication: x-api-key header');
    console.log('3. Send POST request with JSON payload');
    console.log('4. Include required fields: amount, msisdn, tenant_id, customer_id, client_request_id');
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error);
  }
}

testWebhookEndpoint();



