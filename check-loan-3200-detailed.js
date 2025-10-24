const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLoan3200Detailed() {
  console.log('🔍 Detailed Check of Loan ID 3200');
  console.log('=====================================\n');

  const partnerName = 'Umoja Magharibi';
  const loanIdToCheck = 3200;

  // Get partner configuration
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('name', partnerName)
    .single();

  if (partnerError || !partner) {
    console.error('❌ Error fetching partner:', partnerError?.message || 'Partner not found');
    return;
  }

  const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
  const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`;
  
  const loanUrl = `${mifosBaseUrl}/loans/${loanIdToCheck}`;

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
    
    console.log('📊 LOAN 3200 DETAILED ANALYSIS:');
    console.log('================================');
    console.log(`Loan ID: ${loanData.id}`);
    console.log(`Client: ${loanData.clientName} (ID: ${loanData.clientId})`);
    console.log(`Amount: KSh ${loanData.principal?.toLocaleString()}`);
    console.log(`Product: ${loanData.loanProductName}`);
    console.log(`Currency: ${loanData.currency?.code}`);
    console.log('');
    console.log('📋 STATUS INFORMATION:');
    console.log(`Status ID: ${loanData.status?.id}`);
    console.log(`Status Value: ${loanData.status?.value}`);
    console.log(`Waiting for Disbursal: ${loanData.status?.waitingForDisbursal}`);
    console.log(`Active: ${loanData.status?.active}`);
    console.log(`Pending Approval: ${loanData.status?.pendingApproval}`);
    console.log(`Waiting for Disbursal Approval: ${loanData.status?.waitingForDisbursalApproval}`);
    console.log('');
    console.log('📅 TIMELINE:');
    console.log(`Submitted: ${loanData.timeline?.submittedOnDate?.join('/')}`);
    console.log(`Approved: ${loanData.timeline?.approvedOnDate?.join('/')}`);
    console.log(`Disbursed: ${loanData.timeline?.disbursedOnDate?.join('/') || 'Not disbursed'}`);
    console.log('');

    // Check if this should be considered pending disbursement
    console.log('🔍 ANALYSIS:');
    const isWaitingForDisbursal = loanData.status?.waitingForDisbursal === true;
    const isApproved = loanData.status?.value?.toLowerCase().includes('approved');
    const isNotDisbursed = !loanData.timeline?.disbursedOnDate;
    
    console.log(`✅ Waiting for Disbursal: ${isWaitingForDisbursal}`);
    console.log(`✅ Status is Approved: ${isApproved}`);
    console.log(`✅ Not yet disbursed: ${isNotDisbursed}`);
    
    if (isWaitingForDisbursal && isApproved && isNotDisbursed) {
      console.log('\n🎯 CONCLUSION: YES - This loan IS pending disbursement!');
      console.log('   Even though status ID is 200, it has waitingForDisbursal=true');
      console.log('   and is approved but not yet disbursed.');
      
      // Check if we need to create a tracking record
      const { data: existingRecord } = await supabase
        .from('loan_tracking')
        .select('*')
        .eq('partner_id', partner.id)
        .eq('loan_id', loanIdToCheck)
        .single();

      if (!existingRecord) {
        console.log('\n📋 Creating tracking record for this pending loan...');
        
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

        let clientDetails = { displayName: loanData.clientName, mobileNo: 'N/A' };
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
          console.log('\n🎉 Loan 3200 is now in the tracking table as pending disbursement!');
        }
      } else {
        console.log('\n✅ Tracking record already exists for this loan');
        console.log(`   Current status in tracking: ${existingRecord.status}`);
      }
    } else {
      console.log('\n❌ CONCLUSION: NO - This loan is not pending disbursement');
      console.log('   Reasons:');
      if (!isWaitingForDisbursal) console.log('   - Not waiting for disbursal');
      if (!isApproved) console.log('   - Not approved');
      if (!isNotDisbursed) console.log('   - Already disbursed');
    }

  } catch (error) {
    console.error('❌ Error checking loan:', error.message);
  }

  console.log('\n🎉 Detailed loan check completed!');
}

checkLoan3200Detailed();


