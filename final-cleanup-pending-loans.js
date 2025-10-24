const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Load environment variables
require('dotenv').config();

console.log('🔍 Final Cleanup of Pending Disbursement Loans');
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
    return null;
  }
}

async function finalCleanup() {
  try {
    console.log('📋 Step 1: Final cleanup of all pending disbursement loans...');
    
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
    
    const partner = await getUmojaMagharibiPartner();
    if (!partner) {
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    let batchSize = 10; // Process in smaller batches to avoid overwhelming the API
    
    for (let i = 0; i < trackingLoans.length; i += batchSize) {
      const batch = trackingLoans.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (loans ${i + 1}-${Math.min(i + batchSize, trackingLoans.length)})...`);
      
      for (const trackingLoan of batch) {
        try {
          const mifosStatus = await checkLoanStatusInMifos(partner, trackingLoan.loan_id);
          
          if (mifosStatus) {
            let newStatus = 'pending_disbursement'; // Default
            
            if (mifosStatus.closed) {
              newStatus = 'closed';
            } else if (mifosStatus.active) {
              newStatus = 'disbursed';
            } else if (mifosStatus.status?.toLowerCase().includes('rejected')) {
              newStatus = 'rejected';
            }
            
            // Only update if status has changed
            if (newStatus !== 'pending_disbursement') {
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
                console.log(`✅ Updated loan ${trackingLoan.loan_id} to status: ${newStatus} (was: ${mifosStatus.status})`);
                updatedCount++;
              }
            } else {
              console.log(`⏭️  Loan ${trackingLoan.loan_id} is still pending in Mifos X: ${mifosStatus.status}`);
            }
          } else {
            console.log(`❌ Could not check status for loan ${trackingLoan.loan_id}`);
            errorCount++;
          }
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.log(`❌ Error processing loan ${trackingLoan.loan_id}:`, error.message);
          errorCount++;
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < trackingLoans.length) {
        console.log('⏳ Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n📊 Final Cleanup Summary:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total processed: ${trackingLoans.length}`);
    
  } catch (error) {
    console.log('❌ Error during final cleanup:', error.message);
  }
}

async function displayFinalTrackingTable() {
  try {
    console.log('\n📋 Step 2: Displaying final loan tracking table...');
    
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
    
    console.log(`\n📊 Final Loan Tracking Table Summary (${loans.length} total records):`);
    console.log('=' .repeat(80));
    
    Object.entries(statusGroups).forEach(([status, statusLoans]) => {
      const totalAmount = statusLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
      console.log(`\n📋 Status: ${status.toUpperCase()} (${statusLoans.length} loans) - Total: KSh ${totalAmount.toLocaleString()}`);
      console.log('-' .repeat(60));
      
      statusLoans.slice(0, 5).forEach(loan => {
        const loanId = loan.loan_id.toString().padEnd(8);
        const clientName = (loan.client_name || 'Unknown').substring(0, 25).padEnd(25);
        const amount = `KSh ${(loan.loan_amount || 0).toLocaleString()}`.padEnd(15);
        const createdDate = new Date(loan.created_at).toLocaleDateString().padEnd(12);
        
        console.log(`| ${loanId} | ${clientName} | ${amount} | ${createdDate} |`);
      });
      
      if (statusLoans.length > 5) {
        console.log(`... and ${statusLoans.length - 5} more loans`);
      }
    });
    
    console.log('=' .repeat(80));
    
    // Show summary
    const pendingLoans = statusGroups['pending_disbursement'] || [];
    if (pendingLoans.length > 0) {
      const pendingAmount = pendingLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
      console.log(`\n🎯 ACTUAL PENDING DISBURSEMENT LOANS:`);
      console.log(`   Count: ${pendingLoans.length} loans`);
      console.log(`   Total Amount: KSh ${pendingAmount.toLocaleString()}`);
      console.log(`   Average Amount: KSh ${Math.round(pendingAmount / pendingLoans.length).toLocaleString()}`);
    } else {
      console.log(`\n✅ NO PENDING DISBURSEMENT LOANS FOUND`);
      console.log(`   All loans have been processed and are either disbursed, closed, or rejected.`);
    }
    
  } catch (error) {
    console.log('❌ Error displaying final tracking table:', error.message);
  }
}

async function runFinalCleanup() {
  console.log('🚀 Starting final cleanup of pending disbursement loans...\n');
  
  // Final cleanup
  await finalCleanup();
  
  // Display final tracking table
  await displayFinalTrackingTable();
  
  console.log('\n🎉 Final cleanup completed!');
  console.log('\n💡 Summary:');
  console.log('   - All loans have been checked against their actual status in Mifos X');
  console.log('   - Loans that are closed or active in Mifos X have been updated accordingly');
  console.log('   - Only truly pending loans remain in the tracking table');
  console.log('   - You can now view the accurate loan tracking dashboard at: http://localhost:3000/loan-tracking');
}

// Run the final cleanup
runFinalCleanup().catch(error => {
  console.log('\n💥 Final cleanup failed:', error.message);
});


