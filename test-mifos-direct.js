const https = require('https');

// Load environment variables
require('dotenv').config();

console.log('🔍 Testing Direct Mifos X Connection');
console.log('==================================================\n');

// Mifos X configuration for Umoja Magharibi
const MIFOS_CONFIG = {
  host_url: 'https://system.loanspur.com',
  username: 'admin',
  password: 'Atata$$2020',
  tenant_id: 'umoja',
  api_endpoint: '/fineract-provider/api/v1'
};

async function makeMifosRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${MIFOS_CONFIG.host_url}${MIFOS_CONFIG.api_endpoint}${endpoint}`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': MIFOS_CONFIG.tenant_id,
        ...options.headers
      },
      timeout: 30000
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
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

async function testMifosConnection() {
  try {
    console.log('📋 Step 1: Test Mifos X Authentication...');
    try {
      const authResponse = await makeMifosRequest('/authentication', {
        method: 'POST',
        body: {
          username: MIFOS_CONFIG.username,
          password: MIFOS_CONFIG.password
        }
      });
      
      console.log(`📡 Auth Status: ${authResponse.status}`);
      if (authResponse.status === 200 && authResponse.data.base64EncodedAuthenticationKey) {
        console.log('✅ Authentication successful');
        console.log('🔑 Auth Key received:', authResponse.data.base64EncodedAuthenticationKey.substring(0, 20) + '...');
        return authResponse.data.base64EncodedAuthenticationKey;
      } else {
        console.log('❌ Authentication failed');
        console.log('📊 Response:', JSON.stringify(authResponse.data, null, 2));
        return null;
      }
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      return null;
    }

  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return null;
  }
}

async function fetchPendingLoans(authKey) {
  try {
    console.log('\n📋 Step 2: Fetch pending loans (approved but not disbursed)...');
    
    // First, let's get all loans and filter for pending ones
    const loansResponse = await makeMifosRequest('/loans?status=300&limit=50', {
      headers: {
        'Authorization': `Basic ${authKey}`
      }
    });
    
    console.log(`📡 Loans Status: ${loansResponse.status}`);
    if (loansResponse.status === 200) {
      const loans = loansResponse.data.pageItems || [];
      console.log(`✅ Found ${loans.length} loans with status 300 (approved)`);
      
      if (loans.length > 0) {
        console.log('\n📋 Pending Loans Details:');
        loans.forEach((loan, index) => {
          console.log(`  ${index + 1}. Loan ID: ${loan.id}`);
          console.log(`     Client: ${loan.clientName || 'N/A'}`);
          console.log(`     Amount: ${loan.principal || 'N/A'}`);
          console.log(`     Status: ${loan.status.value || 'N/A'}`);
          console.log(`     Product: ${loan.loanProductName || 'N/A'}`);
          console.log(`     Created: ${loan.timeline.submittedOnDate || 'N/A'}`);
          console.log('');
        });
        
        // Let's get detailed info for the first loan
        if (loans.length > 0) {
          const firstLoan = loans[0];
          console.log(`📋 Getting detailed info for Loan ID: ${firstLoan.id}`);
          
          const detailResponse = await makeMifosRequest(`/loans/${firstLoan.id}`, {
            headers: {
              'Authorization': `Basic ${authKey}`
            }
          });
          
          if (detailResponse.status === 200) {
            const loanDetail = detailResponse.data;
            console.log('✅ Loan details retrieved:');
            console.log(`   Client ID: ${loanDetail.clientId}`);
            console.log(`   Client Name: ${loanDetail.clientName}`);
            console.log(`   Principal: ${loanDetail.principal}`);
            console.log(`   Currency: ${loanDetail.currency.code}`);
            console.log(`   Status: ${loanDetail.status.value}`);
            console.log(`   Timeline: ${JSON.stringify(loanDetail.timeline, null, 2)}`);
          }
        }
      } else {
        console.log('ℹ️  No pending loans found with status 300');
      }
      
      return loans;
    } else {
      console.log('❌ Failed to fetch loans');
      console.log('📊 Response:', JSON.stringify(loansResponse.data, null, 2));
      return [];
    }
    
  } catch (error) {
    console.log('❌ Error fetching loans:', error.message);
    return [];
  }
}

async function testClientDetails(authKey, clientId) {
  try {
    console.log(`\n📋 Step 3: Test client details for Client ID: ${clientId}...`);
    
    const clientResponse = await makeMifosRequest(`/clients/${clientId}`, {
      headers: {
        'Authorization': `Basic ${authKey}`
      }
    });
    
    console.log(`📡 Client Status: ${clientResponse.status}`);
    if (clientResponse.status === 200) {
      const client = clientResponse.data;
      console.log('✅ Client details retrieved:');
      console.log(`   ID: ${client.id}`);
      console.log(`   Name: ${client.displayName}`);
      console.log(`   Mobile: ${client.mobileNo || 'N/A'}`);
      console.log(`   Status: ${client.status.value}`);
      console.log(`   Office: ${client.officeName}`);
      return client;
    } else {
      console.log('❌ Failed to fetch client details');
      console.log('📊 Response:', JSON.stringify(clientResponse.data, null, 2));
      return null;
    }
    
  } catch (error) {
    console.log('❌ Error fetching client details:', error.message);
    return null;
  }
}

async function runDirectMifosTest() {
  console.log('🚀 Starting direct Mifos X test...\n');
  
  // Test authentication
  const authKey = await testMifosConnection();
  if (!authKey) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Fetch pending loans
  const pendingLoans = await fetchPendingLoans(authKey);
  
  // Test client details for first loan if available
  if (pendingLoans.length > 0 && pendingLoans[0].clientId) {
    await testClientDetails(authKey, pendingLoans[0].clientId);
  }
  
  console.log('\n🏁 Direct Mifos X test completed');
  console.log(`📊 Summary: Found ${pendingLoans.length} pending loans`);
}

// Run the test
runDirectMifosTest().catch(error => {
  console.log('\n💥 Test failed:', error.message);
});


