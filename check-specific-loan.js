const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSpecificLoan() {
  console.log('🔍 Checking Specific Loan ID 3200');
  console.log('=====================================\n');

  const partnerName = 'Umoja Magharibi';
  const loanIdToCheck = 3200;

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

  // Step 2: Check if loan exists in our tracking table
  console.log(`\n📋 Step 2: Checking if loan ${loanIdToCheck} exists in tracking table...`);
  const { data: trackingRecord, error: trackingError } = await supabase
    .from('loan_tracking')
    .select('*')
    .eq('partner_id', partner.id)
    .eq('loan_id', loanIdToCheck)
    .single();

  if (trackingError && trackingError.code !== 'PGRST116') {
    console.error('❌ Error fetching tracking record:', trackingError.message);
    return;
  }

  if (trackingRecord) {
    console.log('✅ Found in tracking table:');
    console.log(`   Loan ID: ${trackingRecord.loan_id}`);
    console.log(`   Client: ${trackingRecord.client_name}`);
    console.log(`   Phone: ${trackingRecord.phone_number}`);
    console.log(`   Amount: KSh ${trackingRecord.loan_amount.toLocaleString()}`);
    console.log(`   Status: ${trackingRecord.status}`);
    console.log(`   Created: ${new Date(trackingRecord.created_at).toLocaleString()}`);
  } else {
    console.log('❌ Loan not found in tracking table');
  }

  // Step 3: Check loan status in Mifos X
  console.log(`\n📋 Step 3: Checking loan ${loanIdToCheck} status in Mifos X...`);
  const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
  const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`;
  
  const loanUrl = `${mifosBaseUrl}/loans/${loanIdToCheck}`;
  console.log(`📡 Fetching from: ${loanUrl}`);

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

    console.log(`📡 Response Status: ${loanResponse.status}`);

    if (!loanResponse.ok) {
      if (loanResponse.status === 404) {
        console.log('❌ Loan not found in Mifos X (404)');
        console.log('   This could mean:');
        console.log('   1. Loan ID does not exist');
        console.log('   2. Loan was deleted');
        console.log('   3. Different loan ID format expected');
      } else {
        console.error(`❌ Error fetching loan: ${loanResponse.status} ${loanResponse.statusText}`);
        const errorText = await loanResponse.text();
        console.error('Error details:', errorText);
      }
      return;
    }

    const loanData = await loanResponse.json();
    console.log('✅ Loan found in Mifos X:');
    console.log(`   Loan ID: ${loanData.id}`);
    console.log(`   Client ID: ${loanData.clientId}`);
    console.log(`   Client Name: ${loanData.clientName}`);
    console.log(`   Principal: KSh ${loanData.principal?.toLocaleString()}`);
    console.log(`   Currency: ${loanData.currency?.code}`);
    console.log(`   Status ID: ${loanData.status?.id}`);
    console.log(`   Status Value: ${loanData.status?.value}`);
    console.log(`   Waiting for Disbursal: ${loanData.status?.waitingForDisbursal}`);
    console.log(`   Product: ${loanData.loanProductName}`);
    console.log(`   Submitted Date: ${loanData.timeline?.submittedOnDate?.join(',')}`);
    console.log(`   Approved Date: ${loanData.timeline?.approvedOnDate?.join(',')}`);
    console.log(`   Disbursed Date: ${loanData.timeline?.disbursedOnDate?.join(',')}`);

    // Step 4: Determine if this is truly pending disbursement
    console.log(`\n📋 Step 4: Analysis - Is this loan pending disbursement?`);
    
    const isPendingDisbursement = loanData.status?.id === 300 && loanData.status?.waitingForDisbursal === true;
    
    if (isPendingDisbursement) {
      console.log('✅ YES - This loan is approved and pending disbursement!');
      console.log('   Status: Approved (300)');
      console.log('   Waiting for Disbursal: true');
      
      // Check if we need to create a tracking record
      if (!trackingRecord) {
        console.log('\n📋 Step 5: Creating tracking record for this pending loan...');
        
        // Fetch client details
        const clientUrl = `${mifosBaseUrl}/clients/${loanData.clientId}`;
        const clientResponse = await fetch(clientUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Fineract-Platform-TenantId': partner.mifos_tenant_id,
            'Authorization': `Basic ${basicAuth}`
          }
        });

        let clientDetails = { displayName: 'Unknown Client', mobileNo: 'N/A' };
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
            loan_id: loanData.id,
            client_id: loanData.clientId,
            client_name: clientDetails.displayName,
            phone_number: clientDetails.mobileNo,
            loan_amount: loanData.principal,
            status: 'pending_disbursement',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating tracking record:', insertError.message);
        } else {
          console.log('✅ Created tracking record:', newTrackingRecord.id);
          console.log(`   Client: ${clientDetails.displayName}`);
          console.log(`   Phone: ${clientDetails.mobileNo}`);
          console.log(`   Amount: KSh ${loanData.principal.toLocaleString()}`);
        }
      } else {
        console.log('✅ Tracking record already exists');
      }
    } else {
      console.log('❌ NO - This loan is not pending disbursement');
      console.log(`   Current Status: ${loanData.status?.value} (ID: ${loanData.status?.id})`);
      console.log(`   Waiting for Disbursal: ${loanData.status?.waitingForDisbursal}`);
      
      if (loanData.status?.id === 400) {
        console.log('   → This loan is ACTIVE (already disbursed)');
      } else if (loanData.status?.id === 500 || loanData.status?.id === 600) {
        console.log('   → This loan is CLOSED');
      } else if (loanData.status?.id === 700) {
        console.log('   → This loan is REJECTED');
      } else {
        console.log('   → This loan is in a different status');
      }
    }

  } catch (error) {
    console.error('❌ Error checking loan in Mifos X:', error.message);
  }

  console.log('\n🎉 Loan check completed!');
}

checkSpecificLoan();


