const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupTrackingTableStatus200() {
  console.log('🔍 Cleaning Up Tracking Table - Only Status 200 with waitingForDisbursal: true');
  console.log('================================================================================\n');

  const partnerName = 'Umoja Magharibi';

  // Step 1: Get partner configuration
  console.log('📋 Step 1: Getting partner configuration...');
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('name', partnerName)
    .single();

  if (partnerError || !partner) {
    console.error('❌ Error fetching partner:', partnerError?.message || 'Partner not found');
    return;
  }
  console.log('✅ Found partner:', partner.name);

  const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
  const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`;

  // Step 2: Get all current tracking records
  console.log('\n📋 Step 2: Getting all current tracking records...');
  const { data: allTrackingRecords, error: fetchError } = await supabase
    .from('loan_tracking')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching tracking records:', fetchError.message);
    return;
  }

  console.log(`📊 Found ${allTrackingRecords.length} total tracking records`);

  // Step 3: Check each loan in Mifos X and determine if it should be kept
  console.log('\n📋 Step 3: Checking each loan in Mifos X...');
  let keptCount = 0;
  let removedCount = 0;
  let errorCount = 0;
  let newPendingCount = 0;

  for (let i = 0; i < allTrackingRecords.length; i++) {
    const record = allTrackingRecords[i];
    console.log(`\n📦 Processing loan ${record.loan_id} (${i + 1}/${allTrackingRecords.length})...`);

    try {
      const loanUrl = `${mifosBaseUrl}/loans/${record.loan_id}`;
      const loanResponse = await fetch(loanUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Fineract-Platform-TenantId': partner.mifos_tenant_id,
          'Authorization': `Basic ${basicAuth}`
        }
      });

      if (!loanResponse.ok) {
        console.log(`❌ Loan ${record.loan_id} not found in Mifos X (${loanResponse.status}) - removing from tracking`);
        // Remove from tracking table
        const { error: deleteError } = await supabase
          .from('loan_tracking')
          .delete()
          .eq('id', record.id);
        
        if (deleteError) {
          console.error(`   Error deleting record: ${deleteError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Removed loan ${record.loan_id} from tracking`);
          removedCount++;
        }
        continue;
      }

      const loanData = await loanResponse.json();
      const isStatus200 = loanData.status?.id === 200;
      const isWaitingForDisbursal = loanData.status?.waitingForDisbursal === true;
      const shouldKeep = isStatus200 && isWaitingForDisbursal;

      console.log(`   Status ID: ${loanData.status?.id}`);
      console.log(`   Status Value: ${loanData.status?.value}`);
      console.log(`   Waiting for Disbursal: ${loanData.status?.waitingForDisbursal}`);
      console.log(`   Should Keep: ${shouldKeep}`);

      if (shouldKeep) {
        // Update status to pending_disbursement if needed
        if (record.status !== 'pending_disbursement') {
          const { error: updateError } = await supabase
            .from('loan_tracking')
            .update({ 
              status: 'pending_disbursement',
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);
          
          if (updateError) {
            console.error(`   Error updating status: ${updateError.message}`);
            errorCount++;
          } else {
            console.log(`   ✅ Updated loan ${record.loan_id} to pending_disbursement`);
            keptCount++;
          }
        } else {
          console.log(`   ✅ Keeping loan ${record.loan_id} (already pending_disbursement)`);
          keptCount++;
        }
      } else {
        // Remove from tracking table
        const { error: deleteError } = await supabase
          .from('loan_tracking')
          .delete()
          .eq('id', record.id);
        
        if (deleteError) {
          console.error(`   Error deleting record: ${deleteError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Removed loan ${record.loan_id} (status: ${loanData.status?.value})`);
          removedCount++;
        }
      }

      // Add small delay to avoid overwhelming the API
      if (i % 10 === 9) {
        console.log('   ⏳ Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`   ❌ Error processing loan ${record.loan_id}:`, error.message);
      errorCount++;
    }
  }

  // Step 4: Search for any new status 200 loans that might be pending disbursement
  console.log('\n📋 Step 4: Searching for new status 200 loans with waitingForDisbursal: true...');
  
  // Check status 200 loans
  const status200Url = `${mifosBaseUrl}/loans?status=200&limit=100`;
  const status200Response = await fetch(status200Url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Fineract-Platform-TenantId': partner.mifos_tenant_id,
      'Authorization': `Basic ${basicAuth}`
    }
  });

  if (status200Response.ok) {
    const status200Data = await status200Response.json();
    const status200Loans = status200Data.pageItems || status200Data || [];
    
    console.log(`📡 Found ${status200Loans.length} loans with status 200`);
    
    const pendingDisbursementLoans = status200Loans.filter(loan => 
      loan.status?.id === 200 && loan.status?.waitingForDisbursal === true
    );
    
    console.log(`📊 Found ${pendingDisbursementLoans.length} loans with status 200 and waitingForDisbursal: true`);

    // Add new pending disbursement loans to tracking
    for (const loan of pendingDisbursementLoans) {
      const { data: existingRecord } = await supabase
        .from('loan_tracking')
        .select('id')
        .eq('partner_id', partner.id)
        .eq('loan_id', loan.id)
        .single();

      if (!existingRecord) {
        console.log(`📞 Fetching client details for loan ${loan.id}...`);
        
        // Fetch client details
        const clientUrl = `${mifosBaseUrl}/clients/${loan.clientId}`;
        const clientResponse = await fetch(clientUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Fineract-Platform-TenantId': partner.mifos_tenant_id,
            'Authorization': `Basic ${basicAuth}`
          }
        });

        let clientDetails = { displayName: loan.clientName, mobileNo: 'N/A' };
        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          clientDetails = {
            displayName: clientData.displayName,
            mobileNo: clientData.mobileNo || 'N/A',
          };
        }

        const { data: newTrackingRecord, error: insertError } = await supabase
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

        if (insertError) {
          console.error(`❌ Error creating tracking record for loan ${loan.id}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Added new pending disbursement loan ${loan.id}: ${clientDetails.displayName}`);
          newPendingCount++;
        }
      }
    }
  }

  // Step 5: Display final results
  console.log('\n📋 Step 5: Final tracking table summary...');
  const { data: finalRecords, error: finalFetchError } = await supabase
    .from('loan_tracking')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  if (finalFetchError) {
    console.error('❌ Error fetching final records:', finalFetchError.message);
    return;
  }

  console.log(`\n📊 CLEANUP SUMMARY:`);
  console.log(`   Kept: ${keptCount} loans`);
  console.log(`   Removed: ${removedCount} loans`);
  console.log(`   Added new: ${newPendingCount} loans`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Final total: ${finalRecords.length} loans`);

  console.log(`\n📊 FINAL TRACKING TABLE (${finalRecords.length} loans):`);
  console.log('================================================================================');
  
  if (finalRecords.length === 0) {
    console.log('   No loans found with status 200 and waitingForDisbursal: true');
  } else {
    finalRecords.forEach((loan, index) => {
      const clientName = loan.client_name ? loan.client_name.substring(0, 25).padEnd(25, ' ') : 'N/A'.padEnd(25, ' ');
      const amount = `KSh ${loan.loan_amount.toLocaleString()}`.padEnd(15, ' ');
      const createdAt = new Date(loan.created_at).toLocaleDateString('en-GB').padEnd(12, ' ');
      console.log(`| ${String(loan.loan_id).padEnd(7, ' ')} | ${clientName} | ${amount} | ${createdAt} |`);
    });
  }
  console.log('================================================================================\n');

  console.log('🎉 Cleanup completed!');
  console.log('✅ Tracking table now contains only loans with status 200 and waitingForDisbursal: true');
  console.log('🌐 View the results at: http://localhost:3000/loan-tracking');
}

cleanupTrackingTableStatus200();

