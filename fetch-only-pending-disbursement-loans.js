const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Load environment variables
require('dotenv').config();

console.log('🔍 Fetching Only Approved Loans Pending Disbursement');
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
    return partners;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function fetchApprovedPendingDisbursementLoans(partner) {
  try {
    console.log('\n📋 Step 2: Fetching approved loans pending disbursement...');
    
    // Use HTTP Basic Authentication
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
    
    // First, let's check what loan statuses are available
    console.log('📡 Checking available loan statuses...');
    
    // Try different status codes that might indicate "approved and pending disbursement"
    const statusCodes = [
      { code: 300, name: 'Approved' },
      { code: 400, name: 'Active' },
      { code: 500, name: 'Closed' },
      { code: 600, name: 'Written Off' },
      { code: 700, name: 'Rejected' }
    ];
    
    let approvedPendingLoans = [];
    
    for (const status of statusCodes) {
      try {
        const loansUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/loans?status=${status.code}&limit=20`;
        console.log(`📡 Checking status ${status.code} (${status.name})...`);
        
        const loansResponse = await makeMifosRequest(loansUrl, {
          tenantId: partner.mifos_tenant_id,
          headers: {
            'Authorization': `Basic ${basicAuth}`
          }
        });
        
        if (loansResponse.status === 200) {
          const loans = loansResponse.data.pageItems || loansResponse.data || [];
          console.log(`   Found ${loans.length} loans with status ${status.code}`);
          
          if (loans.length > 0) {
            // Show first few loans to understand the status
            loans.slice(0, 3).forEach(loan => {
              console.log(`     Loan ${loan.id}: ${loan.status?.value || 'Unknown'} - ${loan.status?.waitingForDisbursal ? 'Waiting for Disbursal' : 'Not waiting'}`);
            });
            
            // Filter for loans that are approved and waiting for disbursement
            const pendingDisbursement = loans.filter(loan => 
              loan.status?.id === 300 && // Approved status
              loan.status?.waitingForDisbursal === true
            );
            
            if (pendingDisbursement.length > 0) {
              console.log(`   ✅ Found ${pendingDisbursement.length} loans approved and waiting for disbursement`);
              approvedPendingLoans = approvedPendingLoans.concat(pendingDisbursement);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error checking status ${status.code}:`, error.message);
      }
    }
    
    // If we didn't find any with waitingForDisbursal flag, let's try a different approach
    if (approvedPendingLoans.length === 0) {
      console.log('\n📡 Trying alternative approach - looking for approved loans...');
      
      const approvedUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/loans?status=300&limit=50`;
      const approvedResponse = await makeMifosRequest(approvedUrl, {
        tenantId: partner.mifos_tenant_id,
        headers: {
          'Authorization': `Basic ${basicAuth}`
        }
      });
      
      if (approvedResponse.status === 200) {
        const allApprovedLoans = approvedResponse.data.pageItems || approvedResponse.data || [];
        console.log(`📊 Found ${allApprovedLoans.length} loans with status 300 (approved)`);
        
        // Let's examine the structure of these loans to understand their status
        if (allApprovedLoans.length > 0) {
          console.log('\n📋 Examining loan status structure:');
          const sampleLoan = allApprovedLoans[0];
          console.log('Sample loan status object:', JSON.stringify(sampleLoan.status, null, 2));
          
          // Check if there are any loans that might be pending disbursement
          // This could be loans that are approved but not yet active
          const potentiallyPending = allApprovedLoans.filter(loan => {
            const statusValue = loan.status?.value?.toLowerCase() || '';
            return statusValue.includes('approved') && !statusValue.includes('active') && !statusValue.includes('closed');
          });
          
          console.log(`📊 Found ${potentiallyPending.length} potentially pending disbursement loans`);
          
          if (potentiallyPending.length > 0) {
            console.log('\n📋 Potentially pending disbursement loans:');
            potentiallyPending.slice(0, 10).forEach((loan, index) => {
              console.log(`  ${index + 1}. Loan ID: ${loan.id}`);
              console.log(`     Client: ${loan.clientName || 'N/A'}`);
              console.log(`     Amount: ${loan.principal || 'N/A'}`);
              console.log(`     Status: ${loan.status?.value || 'N/A'}`);
              console.log(`     Waiting for Disbursal: ${loan.status?.waitingForDisbursal || 'N/A'}`);
              console.log('');
            });
            
            approvedPendingLoans = potentiallyPending;
          }
        }
      }
    }
    
    console.log(`\n📊 Final Result: Found ${approvedPendingLoans.length} approved loans pending disbursement`);
    return approvedPendingLoans;
    
  } catch (error) {
    console.log('❌ Error fetching approved pending disbursement loans:', error.message);
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
      return {
        displayName: 'Unknown Client',
        mobileNo: 'Unknown',
        emailAddress: '',
        accountNo: ''
      };
    }
    
  } catch (error) {
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
    console.log('\n📋 Step 3: Creating loan tracking records for approved pending disbursement loans...');
    
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
      .eq('status', 'pending_disbursement')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Error fetching loan tracking data:', error.message);
      return;
    }
    
    if (!loans || loans.length === 0) {
      console.log('ℹ️  No pending disbursement loans found');
      return;
    }
    
    console.log(`\n📊 Loan Tracking Table - Pending Disbursement (${loans.length} records):`);
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
    
    // Show summary
    const totalAmount = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
    console.log(`\n📊 Summary:`);
    console.log(`   Total Loans: ${loans.length}`);
    console.log(`   Total Amount: KSh ${totalAmount.toLocaleString()}`);
    console.log(`   Average Amount: KSh ${Math.round(totalAmount / loans.length).toLocaleString()}`);
    
  } catch (error) {
    console.log('❌ Error displaying loan tracking table:', error.message);
  }
}

async function runApprovedPendingLoanFetch() {
  console.log('🚀 Starting approved pending disbursement loan fetch...\n');
  
  // Get partner configuration
  const partner = await getUmojaMagharibiPartner();
  if (!partner) {
    return;
  }
  
  // Fetch approved loans pending disbursement
  const approvedPendingLoans = await fetchApprovedPendingDisbursementLoans(partner);
  
  if (approvedPendingLoans.length === 0) {
    console.log('\nℹ️  No approved loans pending disbursement found');
    console.log('💡 This could mean:');
    console.log('   1. All approved loans have already been disbursed');
    console.log('   2. The loan status structure is different than expected');
    console.log('   3. There are no loans currently in the "approved and waiting for disbursement" state');
    
    // Still show existing tracking records
    await displayLoanTrackingTable();
    return;
  }
  
  // Create loan tracking records
  const { createdCount, skippedCount } = await createLoanTrackingRecords(partner, approvedPendingLoans);
  
  // Display the loan tracking table
  await displayLoanTrackingTable();
  
  console.log('\n🎉 Approved pending disbursement loan fetch completed!');
  console.log(`📊 Results:`);
  console.log(`   Found ${approvedPendingLoans.length} approved loans pending disbursement`);
  console.log(`   Created ${createdCount} new tracking records`);
  console.log(`   Skipped ${skippedCount} existing records`);
  
  if (createdCount > 0) {
    console.log('\n✅ New approved pending disbursement loans are now available in the loan tracking dashboard!');
    console.log('🌐 You can view them at: http://localhost:3000/loan-tracking');
  }
}

// Run the approved pending loan fetch
runApprovedPendingLoanFetch().catch(error => {
  console.log('\n💥 Approved pending loan fetch failed:', error.message);
});

