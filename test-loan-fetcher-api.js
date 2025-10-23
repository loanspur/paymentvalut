const http = require('http');

console.log('🔍 Testing Loan Fetcher API Locally');
console.log('==================================================\n');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000
    };

    const req = http.request(url, requestOptions, (res) => {
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

async function testLoanFetcherAPI() {
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

    console.log('\n📋 Step 2: Test loan fetcher API...');
    try {
      const fetchResponse = await makeRequest(`${BASE_URL}/api/mifos/fetch-pending-loans`, {
        method: 'POST'
      });
      
      console.log(`📡 Status: ${fetchResponse.status}`);
      if (fetchResponse.status === 200) {
        console.log('✅ Loan fetcher API responded successfully');
        console.log('📊 Response:', JSON.stringify(fetchResponse.data, null, 2));
        
        if (fetchResponse.data.success) {
          console.log(`✅ Successfully processed ${fetchResponse.data.totalProcessedLoans} loans`);
          
          if (fetchResponse.data.results && fetchResponse.data.results.length > 0) {
            console.log('\n📋 Partner Results:');
            fetchResponse.data.results.forEach((result, index) => {
              console.log(`  ${index + 1}. ${result.partner}:`);
              console.log(`     Pending Loans: ${result.pendingLoans || 0}`);
              console.log(`     Processed: ${result.processedLoans || 0}`);
              if (result.error) {
                console.log(`     Error: ${result.error}`);
              }
            });
          }
        }
      } else {
        console.log('❌ Loan fetcher API failed');
        console.log('📊 Response:', JSON.stringify(fetchResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error calling loan fetcher API:', error.message);
    }

    console.log('\n📋 Step 3: Test loan processor API...');
    try {
      const processResponse = await makeRequest(`${BASE_URL}/api/mifos/process-pending-loans`, {
        method: 'POST'
      });
      
      console.log(`📡 Status: ${processResponse.status}`);
      if (processResponse.status === 200) {
        console.log('✅ Loan processor API responded successfully');
        console.log('📊 Response:', JSON.stringify(processResponse.data, null, 2));
      } else {
        console.log('❌ Loan processor API failed');
        console.log('📊 Response:', JSON.stringify(processResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error calling loan processor API:', error.message);
    }

    console.log('\n📋 Step 4: Test scheduled loan sync API...');
    try {
      const syncResponse = await makeRequest(`${BASE_URL}/api/mifos/scheduled-loan-sync`, {
        method: 'POST'
      });
      
      console.log(`📡 Status: ${syncResponse.status}`);
      if (syncResponse.status === 200) {
        console.log('✅ Scheduled loan sync API responded successfully');
        console.log('📊 Response:', JSON.stringify(syncResponse.data, null, 2));
      } else {
        console.log('❌ Scheduled loan sync API failed');
        console.log('📊 Response:', JSON.stringify(syncResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error calling scheduled loan sync API:', error.message);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

// Run the test
testLoanFetcherAPI().then(() => {
  console.log('\n🏁 Loan fetcher API test completed');
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
});

