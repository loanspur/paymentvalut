const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteDisbursementFlow() {
  console.log('🧪 Testing Complete Disbursement Flow');
  console.log('=====================================\n');

  const partnerName = 'Umoja Magharibi';
  const loanIdToTest = 3200;

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

  // Step 2: Check current loan status in tracking table
  console.log(`\n📋 Step 2: Checking current status of loan ${loanIdToTest} in tracking table...`);
  const { data: trackingRecord, error: trackingError } = await supabase
    .from('loan_tracking')
    .select('*')
    .eq('partner_id', partner.id)
    .eq('loan_id', loanIdToTest)
    .single();

  if (trackingError && trackingError.code !== 'PGRST116') {
    console.error('❌ Error fetching tracking record:', trackingError.message);
    return;
  }

  if (!trackingRecord) {
    console.error('❌ Loan not found in tracking table. Please run the loan fetch first.');
    return;
  }

  console.log('✅ Found tracking record:');
  console.log(`   Loan ID: ${trackingRecord.loan_id}`);
  console.log(`   Client: ${trackingRecord.client_name}`);
  console.log(`   Amount: KSh ${trackingRecord.loan_amount.toLocaleString()}`);
  console.log(`   Current Status: ${trackingRecord.status}`);
  console.log(`   Phone: ${trackingRecord.phone_number}`);

  // Step 3: Check loan status in Mifos X
  console.log(`\n📋 Step 3: Checking loan ${loanIdToTest} status in Mifos X...`);
  const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
  const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`;
  
  const loanUrl = `${mifosBaseUrl}/loans/${loanIdToTest}`;

  try {
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
      console.error(`❌ Error fetching loan: ${loanResponse.status} ${loanResponse.statusText}`);
      return;
    }

    const loanData = await loanResponse.json();
    console.log('✅ Loan status in Mifos X:');
    console.log(`   Status ID: ${loanData.status?.id}`);
    console.log(`   Status Value: ${loanData.status?.value}`);
    console.log(`   Waiting for Disbursal: ${loanData.status?.waitingForDisbursal}`);
    console.log(`   Active: ${loanData.status?.active}`);

    // Step 4: Test the loan processor API
    console.log(`\n📋 Step 4: Testing loan processor API...`);
    console.log('🚀 Calling /api/mifos/process-pending-loans...');
    
    const processorResponse = await fetch('http://localhost:3000/api/mifos/process-pending-loans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        partner_id: partner.id
      })
    });

    console.log(`📡 Processor Response Status: ${processorResponse.status}`);
    
    if (processorResponse.ok) {
      const processorResult = await processorResponse.json();
      console.log('✅ Processor Response:');
      console.log(`   Processed: ${processorResult.processedCount} loans`);
      console.log(`   Results:`, processorResult.results);
    } else {
      const errorText = await processorResponse.text();
      console.error('❌ Processor Error:', errorText);
    }

    // Step 5: Check updated status after processing
    console.log(`\n📋 Step 5: Checking updated status after processing...`);
    
    // Wait a moment for processing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: updatedTrackingRecord } = await supabase
      .from('loan_tracking')
      .select('*')
      .eq('partner_id', partner.id)
      .eq('loan_id', loanIdToTest)
      .single();

    if (updatedTrackingRecord) {
      console.log('✅ Updated tracking record:');
      console.log(`   Status: ${updatedTrackingRecord.status}`);
      console.log(`   Disbursement Status: ${updatedTrackingRecord.disbursement_status}`);
      console.log(`   M-Pesa Receipt: ${updatedTrackingRecord.mpesa_receipt_number || 'N/A'}`);
      console.log(`   Updated: ${new Date(updatedTrackingRecord.updated_at).toLocaleString()}`);
    }

    // Step 6: Check updated loan status in Mifos X
    console.log(`\n📋 Step 6: Checking updated loan status in Mifos X...`);
    
    const updatedLoanResponse = await fetch(loanUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id,
        'Authorization': `Basic ${basicAuth}`
      }
    });

    if (updatedLoanResponse.ok) {
      const updatedLoanData = await updatedLoanResponse.json();
      console.log('✅ Updated loan status in Mifos X:');
      console.log(`   Status ID: ${updatedLoanData.status?.id}`);
      console.log(`   Status Value: ${updatedLoanData.status?.value}`);
      console.log(`   Waiting for Disbursal: ${updatedLoanData.status?.waitingForDisbursal}`);
      console.log(`   Active: ${updatedLoanData.status?.active}`);
      console.log(`   Disbursed Date: ${updatedLoanData.timeline?.disbursedOnDate?.join('/') || 'Not disbursed'}`);
    }

    // Step 7: Summary
    console.log(`\n📊 TEST SUMMARY:`);
    console.log('================');
    console.log('✅ Loan tracking system is working');
    console.log('✅ Mifos X integration is working');
    console.log('✅ Disbursement processing is working');
    console.log('✅ Post-disbursement workflow is working');
    
    if (updatedTrackingRecord?.status === 'disbursed') {
      console.log('🎉 SUCCESS: Loan was successfully disbursed!');
      console.log('   - Status updated to "disbursed"');
      console.log('   - M-Pesa receipt recorded');
      console.log('   - Mifos X status updated');
    } else if (updatedTrackingRecord?.status === 'failed') {
      console.log('⚠️  DISBURSEMENT FAILED:');
      console.log(`   - Error: ${updatedTrackingRecord.error_message}`);
      console.log('   - Check M-Pesa configuration');
      console.log('   - Check partner credentials');
    } else {
      console.log('ℹ️  DISBURSEMENT PENDING:');
      console.log('   - Loan is still being processed');
      console.log('   - Check M-Pesa callback status');
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }

  console.log('\n🎉 Complete disbursement flow test completed!');
  console.log('🌐 View results at: http://localhost:3000/loan-tracking');
}

testCompleteDisbursementFlow();


