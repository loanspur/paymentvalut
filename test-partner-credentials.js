const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

console.log('🔍 Testing Partner Credentials for Umoja Magharibi');
console.log('==================================================\n');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getPartnerCredentials() {
  try {
    console.log('📋 Step 1: Fetching Umoja Magharibi partner credentials...');
    
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .ilike('name', '%umoja%magharibi%')
      .eq('is_active', true);
    
    if (error) {
      console.log('❌ Error fetching partners:', error.message);
      return null;
    }
    
    if (!partners || partners.length === 0) {
      console.log('❌ No Umoja Magharibi partner found');
      return null;
    }
    
    const partner = partners[0];
    console.log('✅ Found partner:', partner.name);
    console.log('📊 Partner details:');
    console.log(`   ID: ${partner.id}`);
    console.log(`   Name: ${partner.name}`);
    console.log(`   Active: ${partner.is_active}`);
    console.log(`   Mifos Configured: ${partner.is_mifos_configured}`);
    console.log(`   Auto Disbursement: ${partner.mifos_auto_disbursement_enabled}`);
    console.log(`   Tenant ID: ${partner.tenant_id}`);
    
    return partner;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function getPartnerMifosConfig(partnerId) {
  try {
    console.log('\n📋 Step 2: Fetching Mifos configuration...');
    
    const { data: configs, error } = await supabase
      .from('partner_mifos_configs')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.log('❌ Error fetching Mifos config:', error.message);
      return null;
    }
    
    if (!configs) {
      console.log('❌ No Mifos configuration found for partner');
      return null;
    }
    
    console.log('✅ Found Mifos configuration');
    console.log('📊 Config details:');
    console.log(`   Host URL: ${configs.host_url}`);
    console.log(`   Username: ${configs.username}`);
    console.log(`   Tenant ID: ${configs.tenant_id}`);
    console.log(`   API Endpoint: ${configs.api_endpoint}`);
    console.log(`   Password: ${configs.password ? '[ENCRYPTED]' : 'Not set'}`);
    
    return configs;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function testMifosWithPartnerCredentials(config) {
  try {
    console.log('\n📋 Step 3: Testing Mifos X connection with partner credentials...');
    
    const https = require('https');
    
    // Test authentication
    const authUrl = `${config.host_url}${config.api_endpoint}/authentication`;
    console.log(`📡 Testing auth at: ${authUrl}`);
    
    const authResponse = await new Promise((resolve, reject) => {
      const req = https.request(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Fineract-Platform-TenantId': config.tenant_id
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
      
      req.write(JSON.stringify({
        username: config.username,
        password: config.password
      }));
      
      req.end();
    });
    
    console.log(`📡 Auth Status: ${authResponse.status}`);
    if (authResponse.status === 200 && authResponse.data.base64EncodedAuthenticationKey) {
      console.log('✅ Authentication successful with partner credentials');
      console.log('🔑 Auth Key received:', authResponse.data.base64EncodedAuthenticationKey.substring(0, 20) + '...');
      return authResponse.data.base64EncodedAuthenticationKey;
    } else {
      console.log('❌ Authentication failed with partner credentials');
      console.log('📊 Response:', JSON.stringify(authResponse.data, null, 2));
      return null;
    }
    
  } catch (error) {
    console.log('❌ Error testing Mifos connection:', error.message);
    return null;
  }
}

async function fetchPendingLoansWithAuth(authKey, config) {
  try {
    console.log('\n📋 Step 4: Fetching pending loans...');
    
    const https = require('https');
    
    const loansUrl = `${config.host_url}${config.api_endpoint}/loans?status=300&limit=20`;
    console.log(`📡 Fetching loans from: ${loansUrl}`);
    
    const loansResponse = await new Promise((resolve, reject) => {
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
    
    console.log(`📡 Loans Status: ${loansResponse.status}`);
    if (loansResponse.status === 200) {
      const loans = loansResponse.data.pageItems || [];
      console.log(`✅ Found ${loans.length} loans with status 300 (approved)`);
      
      if (loans.length > 0) {
        console.log('\n📋 Pending Loans:');
        loans.forEach((loan, index) => {
          console.log(`  ${index + 1}. Loan ID: ${loan.id}`);
          console.log(`     Client: ${loan.clientName || 'N/A'}`);
          console.log(`     Amount: ${loan.principal || 'N/A'}`);
          console.log(`     Status: ${loan.status.value || 'N/A'}`);
          console.log(`     Product: ${loan.loanProductName || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('ℹ️  No pending loans found');
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

async function runPartnerCredentialTest() {
  console.log('🚀 Starting partner credential test...\n');
  
  // Get partner
  const partner = await getPartnerCredentials();
  if (!partner) {
    return;
  }
  
  // Get Mifos config
  const config = await getPartnerMifosConfig(partner.id);
  if (!config) {
    return;
  }
  
  // Test authentication
  const authKey = await testMifosWithPartnerCredentials(config);
  if (!authKey) {
    return;
  }
  
  // Fetch pending loans
  const pendingLoans = await fetchPendingLoansWithAuth(authKey, config);
  
  console.log('\n🏁 Partner credential test completed');
  console.log(`📊 Summary: Found ${pendingLoans.length} pending loans for ${partner.name}`);
}

// Run the test
runPartnerCredentialTest().catch(error => {
  console.log('\n💥 Test failed:', error.message);
});


