const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config();

console.log('🔍 Testing Local Loan Polling System');
console.log('==================================================\n');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const PARTNER_NAME = 'umoja magharibi';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testLoanPollingSystem() {
  try {
    console.log('📋 Step 1: Check if development server is running...');
    try {
      const healthResponse = await makeRequest(`${BASE_URL}/api/health`);
      if (healthResponse.status === 200) {
        console.log('✅ Development server is running');
      } else {
        console.log('❌ Development server not responding properly');
        return;
      }
    } catch (error) {
      console.log('❌ Development server not running. Please start with: npm run dev');
      return;
    }

    console.log('\n📋 Step 2: Test fetching pending loans from Mifos X...');
    try {
      const fetchResponse = await makeRequest(`${BASE_URL}/api/mifos/fetch-pending-loans`, {
        method: 'POST',
        body: { partner_name: PARTNER_NAME }
      });
      
      console.log(`📡 Status: ${fetchResponse.status}`);
      if (fetchResponse.status === 200) {
        console.log('✅ Successfully fetched pending loans');
        console.log('📊 Response:', JSON.stringify(fetchResponse.data, null, 2));
      } else {
        console.log('❌ Failed to fetch pending loans');
        console.log('📊 Response:', JSON.stringify(fetchResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error fetching pending loans:', error.message);
    }

    console.log('\n📋 Step 3: Test processing pending loans...');
    try {
      const processResponse = await makeRequest(`${BASE_URL}/api/mifos/process-pending-loans`, {
        method: 'POST',
        body: { partner_name: PARTNER_NAME }
      });
      
      console.log(`📡 Status: ${processResponse.status}`);
      if (processResponse.status === 200) {
        console.log('✅ Successfully processed pending loans');
        console.log('📊 Response:', JSON.stringify(processResponse.data, null, 2));
      } else {
        console.log('❌ Failed to process pending loans');
        console.log('📊 Response:', JSON.stringify(processResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error processing pending loans:', error.message);
    }

    console.log('\n📋 Step 4: Test scheduled loan sync (full workflow)...');
    try {
      const syncResponse = await makeRequest(`${BASE_URL}/api/mifos/scheduled-loan-sync`, {
        method: 'POST',
        body: { partner_name: PARTNER_NAME }
      });
      
      console.log(`📡 Status: ${syncResponse.status}`);
      if (syncResponse.status === 200) {
        console.log('✅ Successfully completed scheduled loan sync');
        console.log('📊 Response:', JSON.stringify(syncResponse.data, null, 2));
      } else {
        console.log('❌ Failed to complete scheduled loan sync');
        console.log('📊 Response:', JSON.stringify(syncResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error in scheduled loan sync:', error.message);
    }

    console.log('\n📋 Step 5: Check loan tracking data...');
    try {
      const trackingResponse = await makeRequest(`${BASE_URL}/api/loan-tracking`);
      
      console.log(`📡 Status: ${trackingResponse.status}`);
      if (trackingResponse.status === 200) {
        console.log('✅ Successfully retrieved loan tracking data');
        const loans = trackingResponse.data.loans || [];
        console.log(`📊 Found ${loans.length} loan tracking records`);
        
        if (loans.length > 0) {
          console.log('📋 Recent loans:');
          loans.slice(0, 3).forEach((loan, index) => {
            console.log(`  ${index + 1}. Loan ID: ${loan.loan_id}, Status: ${loan.status}, Amount: ${loan.amount}`);
          });
        }
      } else {
        console.log('❌ Failed to retrieve loan tracking data');
        console.log('📊 Response:', JSON.stringify(trackingResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error retrieving loan tracking data:', error.message);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

// Run the test
testLoanPollingSystem().then(() => {
  console.log('\n🏁 Loan polling system test completed');
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
});


