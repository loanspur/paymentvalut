// Test Script for Credential Retrieval
// This script tests the credential retrieval to identify the issue

const BASE_URL = 'https://your-project.supabase.co/functions/v1/disburse';
const API_KEY = 'your-api-key-here'; // Replace with actual API key

// Test data
const testData = {
  amount: 100,
  msisdn: '254700000001', // Use a different number to avoid duplicate restrictions
  tenant_id: 'KULMNA_TENANT',
  customer_id: 'CUST456',
  client_request_id: `CREDENTIAL-TEST-${Date.now()}`,
};

async function testCredentialRetrieval() {
  console.log('🔍 Testing Credential Retrieval...\n');
  console.log('Request data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log(`\nStatus: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS: Credentials are working correctly!');
    } else if (result.error_code === 'AUTH_1002') {
      console.log('\n❌ AUTH ERROR: Invalid API key');
    } else if (result.error_code && result.error_code.includes('DUPLICATE')) {
      console.log('\n✅ DUPLICATE PREVENTION: Working correctly (this is expected)');
    } else if (result.error_code === 'B2C_1004' || result.error_code === 'B2C_1005') {
      console.log('\n❌ CREDENTIAL ERROR: M-Pesa authentication failed');
      console.log('This indicates a credential retrieval or M-Pesa API issue');
    } else {
      console.log('\n❓ UNKNOWN ERROR: Check the response details above');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the test
testCredentialRetrieval().catch(console.error);




