const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Load environment variables
require('dotenv').config();

console.log('🔍 Fetching Real Pending Loans from Mifos X');
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
    console.log('📋 Step 1: Getting Umoja Magharibi partner configuration...');
    
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .ilike('name', '%umoja%magharibi%')
      .eq('is_active', true)
      .eq('is_mifos_configured', true)
      .eq('mifos_auto_disbursement_enabled', true)
      .single();
    
    if (error) {
      console.log('❌ Error fetching partner:', error.message);
      return null;
    }
    
    if (!partners) {
      console.log('❌ No Umoja Magharibi partner found or not configured');
      return null;
    }
    
    console.log('✅ Found partner:', partners.name);
    console.log('📊 Configuration:');
    console.log(`   Host: ${partners.mifos_host_url}`);
    console.log(`   Username: ${partners.mifos_username}`);
    console.log(`   Tenant: ${partners.mifos_tenant_id}`);
    console.log(`   Auto Disbursement: ${partners.mifos_auto_disbursement_enabled}`);
    
    return partners;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function fetchPendingLoansFromMifos(partner) {
  try {
    console.log('\n📋 Step 2: Fetching pending loans from Mifos X...');
    
    // Use HTTP Basic Authentication (same method as loan products)
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
    
    // Fetch loans with status 300 (approved) and waiting for disbursal
    const loansUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/loans?status=300&limit=100`;
    console.log(`📡 Fetching from: ${loansUrl}`);
    
    const loansResponse = await makeMifosRequest(loansUrl, {
      tenantId: partner.mifos_tenant_id,
      headers: {
        'Authorization': `Basic ${basicAuth}`
      }
    });
    
    console.log(`📡 Response Status: ${loansResponse.status}`);
    
    if (loansResponse.status === 200) {
      const loans = loansResponse.data.pageItems || loansResponse.data || [];
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

async function getClientDetails(partner, clientId) {
  try {
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
    
    const clientUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/clients/${clientId}`;
    
    const clientResponse = await makeMifosRequest(clientUrl, {
      tenantId: partner.mifos_tenant_id,
      headers: {
        'Authorization': `Basic ${basicAuth}`
      }
    });
    
    if (clientResponse.status === 200) {
      const client = clientResponse.data;
      return {
        displayName: client.displayName,
        mobileNo: client.mobileNo,
        emailAddress: client.emailAddress,
        accountNo: client.accountNo
      };
    } else {
      console.log(`❌ Failed to fetch client details for client ${clientId}`);
      return {
        displayName: 'Unknown Client',
        mobileNo: 'Unknown',
        emailAddress: '',
        accountNo: ''
      };
    }
    
  } catch (error) {
    console.log(`❌ Error fetching client details for client ${clientId}:`, error.message);
    return {
      displayName: 'Unknown Client',
      mobileNo: 'Unknown',
      emailAddress: '',
      accountNo: ''
    };
  }
}

async function createLoanTrackingRecords(partner, pendingLoans) {
  try {
    console.log('\n📋 Step 3: Creating loan tracking records...');
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const loan of pendingLoans) {
      try {
        // Check if loan tracking record already exists
        const { data: existingRecord } = await supabase
          .from('loan_tracking')
          .select('id')
          .eq('partner_id', partner.id)
          .eq('loan_id', loan.id)
          .single();
        
        if (existingRecord) {
          console.log(`⏭️  Loan ${loan.id} already tracked, skipping`);
          skippedCount++;
          continue;
        }
        
        // Fetch client details
        console.log(`📞 Fetching client details for client ${loan.clientId}...`);
        const clientDetails = await getClientDetails(partner, loan.clientId);
        
        // Create loan tracking record
        const { data: trackingRecord, error: trackingError } = await supabase
          .from('loan_tracking')
          .insert({
            partner_id: partner.id,
            loan_id: loan.id,
            client_id: loan.clientId,
            client_name: clientDetails.displayName,
            phone_number: clientDetails.mobileNo,
            loan_amount: loan.principal,
            status: 'pending_disbursement',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (trackingError) {
          console.error(`❌ Error creating tracking record for loan ${loan.id}:`, trackingError.message);
          continue;
        }
        
        console.log(`✅ Created tracking record for loan ${loan.id}: ${trackingRecord.id}`);
        console.log(`   Client: ${clientDetails.displayName}`);
        console.log(`   Phone: ${clientDetails.mobileNo}`);
        console.log(`   Amount: KSh ${loan.principal?.toLocaleString()}`);
        createdCount++;
        
      } catch (loanError) {
        console.error(`❌ Error processing loan ${loan.id}:`, loanError.message);
        continue;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${createdCount} new tracking records`);
    console.log(`   Skipped: ${skippedCount} already existing records`);
    console.log(`   Total processed: ${pendingLoans.length} loans`);
    
    return { createdCount, skippedCount };
    
  } catch (error) {
    console.log('❌ Error creating loan tracking records:', error.message);
    return { createdCount: 0, skippedCount: 0 };
  }
}

async function displayLoanTrackingTable() {
  try {
    console.log('\n📋 Step 4: Displaying loan tracking table...');
    
    const { data: loans, error } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners!inner(name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Error fetching loan tracking data:', error.message);
      return;
    }
    
    if (!loans || loans.length === 0) {
      console.log('ℹ️  No loan tracking records found');
      return;
    }
    
    console.log(`\n📊 Loan Tracking Table (${loans.length} records):`);
    console.log('=' .repeat(120));
    console.log('| Loan ID | Client Name           | Phone Number    | Amount (KES) | Status              | Partner        | Created Date    |');
    console.log('=' .repeat(120));
    
    loans.forEach(loan => {
      const loanId = loan.loan_id.toString().padEnd(8);
      const clientName = (loan.client_name || 'Unknown').substring(0, 20).padEnd(20);
      const phoneNumber = (loan.phone_number || 'N/A').substring(0, 15).padEnd(15);
      const amount = `KSh ${(loan.loan_amount || 0).toLocaleString()}`.padEnd(12);
      const status = loan.status.padEnd(20);
      const partnerName = (loan.partners?.name || 'Unknown').substring(0, 13).padEnd(13);
      const createdDate = new Date(loan.created_at).toLocaleDateString().padEnd(15);
      
      console.log(`| ${loanId} | ${clientName} | ${phoneNumber} | ${amount} | ${status} | ${partnerName} | ${createdDate} |`);
    });
    
    console.log('=' .repeat(120));
    
    // Show status summary
    const statusCounts = loans.reduce((acc, loan) => {
      acc[loan.status] = (acc[loan.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} loans`);
    });
    
  } catch (error) {
    console.log('❌ Error displaying loan tracking table:', error.message);
  }
}

async function runRealLoanFetch() {
  console.log('🚀 Starting real loan fetch and display...\n');
  
  // Get partner configuration
  const partner = await getUmojaMagharibiPartner();
  if (!partner) {
    return;
  }
  
  // Fetch pending loans from Mifos X
  const pendingLoans = await fetchPendingLoansFromMifos(partner);
  
  if (pendingLoans.length === 0) {
    console.log('\nℹ️  No pending loans found in Mifos X');
    console.log('💡 This could mean:');
    console.log('   1. No loans are currently approved and waiting for disbursement');
    console.log('   2. All approved loans have already been disbursed');
    console.log('   3. The loan status in Mifos X is different from expected');
    
    // Still show existing tracking records
    await displayLoanTrackingTable();
    return;
  }
  
  // Create loan tracking records
  const { createdCount, skippedCount } = await createLoanTrackingRecords(partner, pendingLoans);
  
  // Display the loan tracking table
  await displayLoanTrackingTable();
  
  console.log('\n🎉 Real loan fetch completed!');
  console.log(`📊 Results:`);
  console.log(`   Found ${pendingLoans.length} pending loans in Mifos X`);
  console.log(`   Created ${createdCount} new tracking records`);
  console.log(`   Skipped ${skippedCount} existing records`);
  
  if (createdCount > 0) {
    console.log('\n✅ New loans are now available in the loan tracking dashboard!');
    console.log('🌐 You can view them at: http://localhost:3000/loan-tracking');
  }
}

// Run the real loan fetch
runRealLoanFetch().catch(error => {
  console.log('\n💥 Real loan fetch failed:', error.message);
});







