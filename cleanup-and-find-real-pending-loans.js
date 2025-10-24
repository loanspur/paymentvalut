const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Load environment variables
require('dotenv').config();

console.log('🔍 Cleaning Up and Finding Real Pending Disbursement Loans');
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
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .ilike('name', '%umoja%magharibi%')
      .eq('is_active', true)
      .eq('is_mifos_configured', true)
      .eq('mifos_auto_disbursement_enabled', true)
      .single();
    
    if (error || !partners) {
      console.log('❌ No Umoja Magharibi partner found');
      return null;
    }
    
    console.log('✅ Found partner:', partners.name);
    return partners;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function checkLoanStatusInMifos(partner, loanId) {
  try {
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
    
    const loanUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/loans/${loanId}`;
    
    const loanResponse = await makeMifosRequest(loanUrl, {
      tenantId: partner.mifos_tenant_id,
      headers: {
        'Authorization': `Basic ${basicAuth}`
      }
    });
    
    if (loanResponse.status === 200) {
      const loan = loanResponse.data;
      return {
        id: loan.id,
        status: loan.status?.value || 'Unknown',
        statusId: loan.status?.id,
        waitingForDisbursal: loan.status?.waitingForDisbursal || false,
        active: loan.status?.active || false,
        closed: loan.status?.closed || false
      };
    } else {
      return null;
    }
    
  } catch (error) {
    console.log(`❌ Error checking loan ${loanId}:`, error.message);
    return null;
  }
}

async function cleanupClosedLoans(partner) {
  try {
    console.log('\n📋 Step 1: Checking loan statuses in Mifos X and cleaning up closed loans...');
    
    // Get all pending disbursement loans from our tracking table
    const { data: trackingLoans, error } = await supabase
      .from('loan_tracking')
      .select('*')
      .eq('status', 'pending_disbursement')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Error fetching tracking loans:', error.message);
      return;
    }
    
    if (!trackingLoans || trackingLoans.length === 0) {
      console.log('ℹ️  No pending disbursement loans in tracking table');
      return;
    }
    
    console.log(`📊 Found ${trackingLoans.length} loans in tracking table with pending_disbursement status`);
    
    let closedCount = 0;
    let stillPendingCount = 0;
    let errorCount = 0;
    
    // Check each loan's status in Mifos X
    for (const trackingLoan of trackingLoans.slice(0, 20)) { // Check first 20 to avoid too many API calls
      try {
        const mifosStatus = await checkLoanStatusInMifos(partner, trackingLoan.loan_id);
        
        if (mifosStatus) {
          console.log(`Loan ${trackingLoan.loan_id}: ${mifosStatus.status} (ID: ${mifosStatus.statusId})`);
          
          // If loan is closed or active in Mifos X, update our tracking record
          if (mifosStatus.closed || mifosStatus.active) {
            const newStatus = mifosStatus.active ? 'disbursed' : 'closed';
            
            const { error: updateError } = await supabase
              .from('loan_tracking')
              .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', trackingLoan.id);
            
            if (updateError) {
              console.log(`❌ Error updating loan ${trackingLoan.loan_id}:`, updateError.message);
              errorCount++;
            } else {
              console.log(`✅ Updated loan ${trackingLoan.loan_id} to status: ${newStatus}`);
              closedCount++;
            }
          } else {
            stillPendingCount++;
          }
        } else {
          errorCount++;
        }
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Error processing loan ${trackingLoan.loan_id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Updated to disbursed/closed: ${closedCount}`);
    console.log(`   Still pending: ${stillPendingCount}`);
    console.log(`   Errors: ${errorCount}`);
    
  } catch (error) {
    console.log('❌ Error during cleanup:', error.message);
  }
}

async function findTrulyPendingLoans(partner) {
  try {
    console.log('\n📋 Step 2: Looking for truly pending disbursement loans...');
    
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
    
    // Try to find loans that are in a "submitted" or "approved" state but not yet disbursed
    // Let's check different possible status codes
    const possibleStatuses = [
      { code: 100, name: 'Submitted' },
      { code: 200, name: 'Under Review' },
      { code: 300, name: 'Approved' },
      { code: 400, name: 'Active' }
    ];
    
    let trulyPendingLoans = [];
    
    for (const status of possibleStatuses) {
      try {
        const loansUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint}/loans?status=${status.code}&limit=50`;
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
            // Check the first few loans to understand their status
            for (const loan of loans.slice(0, 5)) {
              console.log(`     Loan ${loan.id}: ${loan.status?.value || 'Unknown'} - Waiting: ${loan.status?.waitingForDisbursal || false}`);
              
              // Look for loans that are approved but waiting for disbursement
              if (loan.status?.waitingForDisbursal === true || 
                  (loan.status?.value?.toLowerCase().includes('approved') && !loan.status?.active)) {
                trulyPendingLoans.push(loan);
              }
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error checking status ${status.code}:`, error.message);
      }
    }
    
    console.log(`\n📊 Found ${trulyPendingLoans.length} truly pending disbursement loans`);
    
    if (trulyPendingLoans.length > 0) {
      console.log('\n📋 Truly Pending Disbursement Loans:');
      trulyPendingLoans.forEach((loan, index) => {
        console.log(`  ${index + 1}. Loan ID: ${loan.id}`);
        console.log(`     Client: ${loan.clientName || 'N/A'}`);
        console.log(`     Amount: ${loan.principal || 'N/A'}`);
        console.log(`     Status: ${loan.status?.value || 'N/A'}`);
        console.log(`     Waiting for Disbursal: ${loan.status?.waitingForDisbursal || false}`);
        console.log('');
      });
    }
    
    return trulyPendingLoans;
    
  } catch (error) {
    console.log('❌ Error finding truly pending loans:', error.message);
    return [];
  }
}

async function displayCurrentTrackingTable() {
  try {
    console.log('\n📋 Step 3: Displaying current loan tracking table...');
    
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
    
    // Group by status
    const statusGroups = loans.reduce((acc, loan) => {
      const status = loan.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(loan);
      return acc;
    }, {});
    
    console.log(`\n📊 Loan Tracking Table Summary (${loans.length} total records):`);
    console.log('=' .repeat(80));
    
    Object.entries(statusGroups).forEach(([status, statusLoans]) => {
      console.log(`\n📋 Status: ${status.toUpperCase()} (${statusLoans.length} loans)`);
      console.log('-' .repeat(60));
      
      statusLoans.slice(0, 10).forEach(loan => {
        const loanId = loan.loan_id.toString().padEnd(8);
        const clientName = (loan.client_name || 'Unknown').substring(0, 25).padEnd(25);
        const amount = `KSh ${(loan.loan_amount || 0).toLocaleString()}`.padEnd(15);
        const createdDate = new Date(loan.created_at).toLocaleDateString().padEnd(12);
        
        console.log(`| ${loanId} | ${clientName} | ${amount} | ${createdDate} |`);
      });
      
      if (statusLoans.length > 10) {
        console.log(`... and ${statusLoans.length - 10} more loans`);
      }
    });
    
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.log('❌ Error displaying tracking table:', error.message);
  }
}

async function runCleanupAndFindPending() {
  console.log('🚀 Starting cleanup and finding real pending loans...\n');
  
  // Get partner configuration
  const partner = await getUmojaMagharibiPartner();
  if (!partner) {
    return;
  }
  
  // Clean up closed loans
  await cleanupClosedLoans(partner);
  
  // Find truly pending loans
  const trulyPendingLoans = await findTrulyPendingLoans(partner);
  
  // Display current tracking table
  await displayCurrentTrackingTable();
  
  console.log('\n🎉 Cleanup and pending loan search completed!');
  
  if (trulyPendingLoans.length === 0) {
    console.log('\n💡 No truly pending disbursement loans found in Mifos X');
    console.log('   This suggests that either:');
    console.log('   1. All loans have been processed and disbursed');
    console.log('   2. The loan approval workflow is different than expected');
    console.log('   3. Loans are in a different status than we\'re checking');
  } else {
    console.log(`\n✅ Found ${trulyPendingLoans.length} truly pending disbursement loans!`);
  }
}

// Run the cleanup and search
runCleanupAndFindPending().catch(error => {
  console.log('\n💥 Cleanup and search failed:', error.message);
});


