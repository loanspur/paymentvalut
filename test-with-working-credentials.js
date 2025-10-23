const https = require('https');

console.log('🔍 Testing with Working Credentials');
console.log('==================================================\n');

// Test with the exact credentials that worked before
const TEST_CONFIGS = [
  {
    name: 'Original Working Config',
    host_url: 'https://system.loanspur.com',
    username: 'admin',
    password: 'Atata$$2020',
    tenant_id: 'umoja',
    api_endpoint: '/fineract-provider/api/v1'
  },
  {
    name: 'Alternative Tenant',
    host_url: 'https://system.loanspur.com',
    username: 'admin',
    password: 'Atata$$2020',
    tenant_id: 'default',
    api_endpoint: '/fineract-provider/api/v1'
  },
  {
    name: 'Different Username',
    host_url: 'https://system.loanspur.com',
    username: 'admin',
    password: 'Atata$$2020',
    tenant_id: 'umoja',
    api_endpoint: '/fineract-provider/api/v1'
  }
];

async function makeMifosRequest(config) {
  return new Promise((resolve, reject) => {
    const authUrl = `${config.host_url}${config.api_endpoint}/authentication`;
    console.log(`📡 Testing: ${config.name}`);
    console.log(`   URL: ${authUrl}`);
    console.log(`   Username: ${config.username}`);
    console.log(`   Tenant: ${config.tenant_id}`);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': config.tenant_id
      },
      timeout: 30000
    };

    const req = https.request(authUrl, requestOptions, (res) => {
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
    
    req.write(JSON.stringify({
      username: config.username,
      password: config.password
    }));
    
    req.end();
  });
}

async function testCredentials() {
  console.log('🚀 Testing different credential combinations...\n');
  
  for (const config of TEST_CONFIGS) {
    try {
      console.log(`\n📋 Testing: ${config.name}`);
      console.log('=' .repeat(50));
      
      const response = await makeMifosRequest(config);
      
      console.log(`📡 Status: ${response.status}`);
      if (response.status === 200) {
        console.log('✅ SUCCESS! Authentication worked');
        console.log('🔑 Auth Key:', response.data.base64EncodedAuthenticationKey?.substring(0, 20) + '...');
        
        // If authentication works, test fetching loans
        console.log('\n📋 Testing loan fetching...');
        await testLoanFetching(config, response.data.base64EncodedAuthenticationKey);
        
        return config; // Return the working config
      } else {
        console.log('❌ Authentication failed');
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
  
  return null;
}

async function testLoanFetching(config, authKey) {
  try {
    const loansUrl = `${config.host_url}${config.api_endpoint}/loans?status=300&limit=10`;
    console.log(`📡 Fetching loans from: ${loansUrl}`);
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(loansUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Fineract-Platform-TenantId': config.tenant_id,
          'Authorization': `Basic ${authKey}`
        },
        timeout: 30000
      }, (res) => {
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
      req.end();
    });
    
    console.log(`📡 Loans Status: ${response.status}`);
    if (response.status === 200) {
      const loans = response.data.pageItems || [];
      console.log(`✅ Found ${loans.length} pending loans`);
      
      if (loans.length > 0) {
        console.log('\n📋 Pending Loans:');
        loans.forEach((loan, index) => {
          console.log(`  ${index + 1}. Loan ID: ${loan.id}`);
          console.log(`     Client: ${loan.clientName || 'N/A'}`);
          console.log(`     Amount: ${loan.principal || 'N/A'}`);
          console.log(`     Status: ${loan.status?.value || 'N/A'}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Failed to fetch loans');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Error fetching loans:', error.message);
  }
}

async function runCredentialTest() {
  const workingConfig = await testCredentials();
  
  console.log('\n🏁 Credential test completed');
  if (workingConfig) {
    console.log('✅ Found working credentials!');
    console.log('📊 Working config:', workingConfig.name);
    console.log('💡 You can use these credentials in your loan polling system');
  } else {
    console.log('❌ No working credentials found');
    console.log('💡 Possible solutions:');
    console.log('   1. Check if the Mifos X server is accessible');
    console.log('   2. Verify the correct tenant ID');
    console.log('   3. Check if the admin user account is active');
    console.log('   4. Try logging in through the web interface first');
  }
}

// Run the test
runCredentialTest().catch(error => {
  console.log('\n💥 Test failed:', error.message);
});

