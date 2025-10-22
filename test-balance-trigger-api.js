// Test script to trigger balance check through the API endpoint
const https = require('https');
const http = require('http');

function testBalanceTriggerAPI() {
  console.log('🚀 Testing Balance Trigger API...\n');
  
  // Test the trigger-check API endpoint (this is what the UI calls)
  const apiUrl = 'http://localhost:3000/api/balance/trigger-check';
  
  console.log('📡 Calling balance trigger API...');
  console.log('URL:', apiUrl);
  
  const postData = JSON.stringify({
    all_tenants: true,
    force_check: true
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(apiUrl, options, (res) => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('📊 Response Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(data);
          console.log('✅ Balance Trigger API Response:');
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('❌ Balance Trigger API Error:');
          console.log(data);
        }
      } catch (parseError) {
        console.log('❌ Parse Error:', parseError.message);
        console.log('Raw Response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
  });
  
  req.write(postData);
  req.end();
}

// Run the test
testBalanceTriggerAPI();
