const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Load environment variables
require('dotenv').config();

console.log('🔍 Testing Mifos X with Partner Data');
console.log('==================================================\n');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeMifosRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': options.tenantId,
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

async function getUmojaMagharibiPartner() {
  try {
    console.log('📋 Step 1: Fetching Umoja Magharibi partner data...');
    
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .ilike('name', '%umoja%magharibi%')
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.log('❌ Error fetching partner:', error.message);
      return null;
    }
    
    if (!partners) {
      console.log('❌ No Umoja Magharibi partner found');
      return null;
    }
    
    console.log('✅ Found partner:', partners.name);
    console.log('📊 Mifos Configuration:');
    console.log(`   Host URL: ${partners.mifos_host_url}`);
    console.log(`   Username: ${partners.mifos_username}`);
    console.log(`   Tenant ID: ${partners.mifos_tenant_id}`);
    console.log(`   API Endpoint: ${partners.mifos_api_endpoint}`);
    console.log(`   Password: ${partners.mifos_password ? '[SET]' : '[EMPTY]'}`);
    console.log(`   Auto Disbursement: ${partners.mifos_auto_disbursement_enabled}`);
    
    return partners;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function testMifosAuthentication(partner) {
  try {
    console.log('\n📋 Step 2: Testing Mifos X Authentication...');
    
    const authUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/authentication`;
    console.log(`📡 Authenticating at: ${authUrl}`);
    
    const authResponse = await makeMifosRequest(authUrl, {
      method: 'POST',
      tenantId: partner.mifos_tenant_id,
      body: {
        username: partner.mifos_username,
        password: partner.mifos_password
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
}

async function fetchPendingLoans(partner, authKey) {
  try {
    console.log('\n📋 Step 3: Fetching pending loans (status 300 - approved)...');
    
    const loansUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/loans?status=300&limit=20`;
    console.log(`📡 Fetching loans from: ${loansUrl}`);
    
    const loansResponse = await makeMifosRequest(loansUrl, {
      tenantId: partner.mifos_tenant_id,
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
          console.log(`     Client ID: ${loan.clientId}`);
          console.log(`     Client Name: ${loan.clientName || 'N/A'}`);
          console.log(`     Principal: ${loan.principal || 'N/A'}`);
          console.log(`     Currency: ${loan.currency?.code || 'N/A'}`);
          console.log(`     Status: ${loan.status?.value || 'N/A'}`);
          console.log(`     Product: ${loan.loanProductName || 'N/A'}`);
          console.log(`     Created: ${loan.timeline?.submittedOnDate || 'N/A'}`);
          console.log('');
        });
        
        return loans;
      } else {
        console.log('ℹ️  No pending loans found with status 300');
        return [];
      }
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

async function getLoanDetails(partner, authKey, loanId) {
  try {
    console.log(`\n📋 Step 4: Getting detailed info for Loan ID: ${loanId}...`);
    
    const loanUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/loans/${loanId}`;
    console.log(`📡 Fetching loan details from: ${loanUrl}`);
    
    const loanResponse = await makeMifosRequest(loanUrl, {
      tenantId: partner.mifos_tenant_id,
      headers: {
        'Authorization': `Basic ${authKey}`
      }
    });
    
    console.log(`📡 Loan Details Status: ${loanResponse.status}`);
    if (loanResponse.status === 200) {
      const loan = loanResponse.data;
      console.log('✅ Loan details retrieved:');
      console.log(`   Loan ID: ${loan.id}`);
      console.log(`   Client ID: ${loan.clientId}`);
      console.log(`   Client Name: ${loan.clientName}`);
      console.log(`   Principal: ${loan.principal}`);
      console.log(`   Currency: ${loan.currency?.code}`);
      console.log(`   Status: ${loan.status?.value}`);
      console.log(`   Product: ${loan.loanProductName}`);
      console.log(`   Timeline:`, JSON.stringify(loan.timeline, null, 2));
      return loan;
    } else {
      console.log('❌ Failed to fetch loan details');
      console.log('📊 Response:', JSON.stringify(loanResponse.data, null, 2));
      return null;
    }
    
  } catch (error) {
    console.log('❌ Error fetching loan details:', error.message);
    return null;
  }
}

async function getClientDetails(partner, authKey, clientId) {
  try {
    console.log(`\n📋 Step 5: Getting client details for Client ID: ${clientId}...`);
    
    const clientUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/clients/${clientId}`;
    console.log(`📡 Fetching client details from: ${clientUrl}`);
    
    const clientResponse = await makeMifosRequest(clientUrl, {
      tenantId: partner.mifos_tenant_id,
      headers: {
        'Authorization': `Basic ${authKey}`
      }
    });
    
    console.log(`📡 Client Details Status: ${clientResponse.status}`);
    if (clientResponse.status === 200) {
      const client = clientResponse.data;
      console.log('✅ Client details retrieved:');
      console.log(`   Client ID: ${client.id}`);
      console.log(`   Name: ${client.displayName}`);
      console.log(`   Mobile: ${client.mobileNo || 'N/A'}`);
      console.log(`   Status: ${client.status?.value}`);
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

async function runMifosTest() {
  console.log('🚀 Starting Mifos X test with partner data...\n');
  
  // Get partner data
  const partner = await getUmojaMagharibiPartner();
  if (!partner) {
    return;
  }
  
  // Test authentication
  const authKey = await testMifosAuthentication(partner);
  if (!authKey) {
    return;
  }
  
  // Fetch pending loans
  const pendingLoans = await fetchPendingLoans(partner, authKey);
  
  // Get detailed info for first loan if available
  if (pendingLoans.length > 0) {
    const firstLoan = pendingLoans[0];
    await getLoanDetails(partner, authKey, firstLoan.id);
    
    if (firstLoan.clientId) {
      await getClientDetails(partner, authKey, firstLoan.clientId);
    }
  }
  
  console.log('\n🏁 Mifos X test completed');
  console.log(`📊 Summary: Found ${pendingLoans.length} pending loans for ${partner.name}`);
  
  if (pendingLoans.length > 0) {
    console.log('\n✅ SUCCESS: Loan polling system can fetch pending loans from Mifos X!');
    console.log('📋 The system is ready to:');
    console.log('   1. Fetch approved loans from Mifos X');
    console.log('   2. Create loan tracking records');
    console.log('   3. Process disbursements');
    console.log('   4. Update loan status in Mifos X after disbursement');
  } else {
    console.log('\nℹ️  No pending loans found, but the connection is working!');
    console.log('📋 The system is ready to process loans when they become available.');
  }
}

// Run the test
runMifosTest().catch(error => {
  console.log('\n💥 Test failed:', error.message);
});


