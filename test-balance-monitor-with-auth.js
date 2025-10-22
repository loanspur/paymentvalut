// Test script to trigger balance monitor with proper authorization
const https = require('https');

function testBalanceMonitorWithAuth() {
  console.log('🚀 Testing Balance Monitor Function with Auth...\n');
  
  const supabaseUrl = 'https://mapgmmiobityxaaevomp.supabase.co';
  const functionUrl = `${supabaseUrl}/functions/v1/balance-monitor`;
  
  // You'll need to get the service key from your environment
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.log('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.log('Please set it with: set SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    return;
  }
  
  console.log('📡 Calling balance monitor function...');
  console.log('URL:', functionUrl);
  
  const postData = JSON.stringify({
    force_check: true
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = https.request(functionUrl, options, (res) => {
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
          console.log('✅ Balance Monitor Response:');
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('❌ Balance Monitor Error:');
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
testBalanceMonitorWithAuth();

