const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateSuccessfulDisbursement() {
  console.log('🎭 Simulating Successful Disbursement Flow');
  console.log('==========================================\n');

  const partnerName = 'Umoja Magharibi';
  const loanIdToSimulate = 3200;

  // Step 1: Get partner and loan details
  console.log('📋 Step 1: Getting partner and loan details...');
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('name', partnerName)
    .single();

  if (partnerError || !partner) {
    console.error('❌ Error fetching partner:', partnerError?.message || 'Partner not found');
    return;
  }

  const { data: loanRecord, error: loanError } = await supabase
    .from('loan_tracking')
    .select('*')
    .eq('partner_id', partner.id)
    .eq('loan_id', loanIdToSimulate)
    .single();

  if (loanError) {
    console.error('❌ Error fetching loan record:', loanError.message);
    return;
  }

  console.log('✅ Found loan record:');
  console.log(`   Loan ID: ${loanRecord.loan_id}`);
  console.log(`   Client: ${loanRecord.client_name}`);
  console.log(`   Amount: KSh ${loanRecord.loan_amount.toLocaleString()}`);
  console.log(`   Phone: ${loanRecord.phone_number}`);
  console.log(`   Current Status: ${loanRecord.status}`);

  // Step 2: Simulate M-Pesa success response
  console.log('\n📱 Step 2: Simulating M-Pesa success response...');
  const simulatedMpesaResponse = {
    ResponseCode: '0',
    ResponseDescription: 'Success',
    ConversationID: `WS_CO_${Date.now()}`,
    OriginatorConversationID: `29415-${Date.now()}-1`,
    TransactionReceipt: `NLJ${Date.now()}`,
    TransactionAmount: loanRecord.loan_amount,
    TransactionDate: new Date().toISOString().split('T')[0],
    B2CWorkingAccountAvailableFunds: '50000.00',
    B2CUtilityAccountAvailableFunds: '10000.00',
    B2CChargesPaidAccountAvailableFunds: '500.00'
  };

  console.log('📤 Simulated M-Pesa Response:');
  console.log(`   Response Code: ${simulatedMpesaResponse.ResponseCode}`);
  console.log(`   Response Description: ${simulatedMpesaResponse.ResponseDescription}`);
  console.log(`   Transaction Receipt: ${simulatedMpesaResponse.TransactionReceipt}`);
  console.log(`   Transaction Amount: KSh ${simulatedMpesaResponse.TransactionAmount.toLocaleString()}`);
  console.log(`   Conversation ID: ${simulatedMpesaResponse.ConversationID}`);

  // Step 3: Create disbursement record
  console.log('\n💾 Step 3: Creating disbursement record...');
  const disbursementData = {
    partner_id: partner.id,
    tenant_id: partner.tenant_id || 'default',
    msisdn: loanRecord.phone_number,
    amount: loanRecord.loan_amount,
    customer_id: loanRecord.client_id.toString(),
    client_request_id: `sim_${loanRecord.loan_id}_${Date.now()}`,
    external_reference: loanRecord.loan_id.toString(),
    origin: 'ui',
    description: `Simulated disbursement for loan ${loanRecord.loan_id}`,
    currency: 'KES',
    status: 'success',
    conversation_id: simulatedMpesaResponse.ConversationID,
    transaction_receipt: simulatedMpesaResponse.TransactionReceipt,
    transaction_amount: simulatedMpesaResponse.TransactionAmount,
    transaction_date: simulatedMpesaResponse.TransactionDate,
    result_code: simulatedMpesaResponse.ResponseCode,
    result_desc: simulatedMpesaResponse.ResponseDescription,
    // Note: Balance columns may not exist in all schema versions
    metadata: {
      mifos_loan_id: loanRecord.loan_id,
      mifos_client_id: loanRecord.client_id,
      client_name: loanRecord.client_name,
      simulated: true,
      simulated_at: new Date().toISOString()
    }
  };

  const { data: disbursement, error: disbursementError } = await supabase
    .from('disbursement_requests')
    .insert(disbursementData)
    .select()
    .single();

  if (disbursementError) {
    console.error('❌ Error creating disbursement record:', disbursementError.message);
    return;
  }

  console.log('✅ Created disbursement record:');
  console.log(`   Disbursement ID: ${disbursement.id}`);
  console.log(`   Status: ${disbursement.status}`);
  console.log(`   Receipt: ${disbursement.transaction_receipt}`);
  console.log(`   Amount: KSh ${disbursement.transaction_amount.toLocaleString()}`);

  // Step 4: Update loan tracking record
  console.log('\n📊 Step 4: Updating loan tracking record...');
  const { data: updatedLoanRecord, error: updateError } = await supabase
    .from('loan_tracking')
    .update({
      status: 'disbursed',
      disbursement_status: 'completed',
      disbursement_id: disbursement.id,
      mpesa_receipt_number: disbursement.transaction_receipt,
      updated_at: new Date().toISOString()
    })
    .eq('id', loanRecord.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating loan tracking:', updateError.message);
    return;
  }

  console.log('✅ Updated loan tracking record:');
  console.log(`   Status: ${updatedLoanRecord.status}`);
  console.log(`   Disbursement Status: ${updatedLoanRecord.disbursement_status}`);
  console.log(`   M-Pesa Receipt: ${updatedLoanRecord.mpesa_receipt_number}`);
  console.log(`   Disbursement ID: ${updatedLoanRecord.disbursement_id}`);

  // Step 5: Simulate Mifos X loan activation
  console.log('\n🏦 Step 5: Simulating Mifos X loan activation...');
  
  const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
  const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`;
  
  // First, get current loan status
  const loanUrl = `${mifosBaseUrl}/loans/${loanIdToSimulate}`;
  const loanResponse = await fetch(loanUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Fineract-Platform-TenantId': partner.mifos_tenant_id,
      'Authorization': `Basic ${basicAuth}`
    }
  });

  if (loanResponse.ok) {
    const currentLoanData = await loanResponse.json();
    console.log('📋 Current loan status in Mifos X:');
    console.log(`   Status ID: ${currentLoanData.status?.id}`);
    console.log(`   Status Value: ${currentLoanData.status?.value}`);
    console.log(`   Waiting for Disbursal: ${currentLoanData.status?.waitingForDisbursal}`);
    console.log(`   Disbursed Date: ${currentLoanData.timeline?.disbursedOnDate?.join('/') || 'Not disbursed'}`);

    // Simulate loan activation (this would normally be done by the system)
    console.log('\n🔄 Simulating loan activation in Mifos X...');
    console.log('   In a real scenario, the system would:');
    console.log(`   1. Call POST /loans/${loanIdToSimulate}?command=disburseToSavings`);
    console.log(`   2. Update loan status from "Approved" (200) to "Active" (300)`);
    console.log(`   3. Record disbursement date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`   4. Add transaction note: "Disbursed via Payment Vault - Receipt: ${disbursement.transaction_receipt}"`);
    
    // For simulation, we'll just show what the updated loan would look like
    console.log('\n📊 Simulated updated loan status:');
    console.log(`   Status ID: 300 (Active)`);
    console.log(`   Status Value: Active`);
    console.log(`   Waiting for Disbursal: false`);
    console.log(`   Disbursed Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`   Transaction Note: Disbursed via Payment Vault - Receipt: ${disbursement.transaction_receipt}`);
  } else {
    console.log('⚠️ Could not fetch current loan status from Mifos X');
  }

  // Step 6: Display final summary
  console.log('\n🎉 SIMULATION COMPLETE!');
  console.log('========================');
  console.log('✅ M-Pesa disbursement successful');
  console.log('✅ Disbursement record created');
  console.log('✅ Loan tracking updated');
  console.log('✅ Mifos X loan activation simulated');
  
  console.log('\n📊 Final Status:');
  console.log(`   Loan ID: ${loanIdToSimulate}`);
  console.log(`   Client: ${loanRecord.client_name}`);
  console.log(`   Amount: KSh ${loanRecord.loan_amount.toLocaleString()}`);
  console.log(`   M-Pesa Receipt: ${disbursement.transaction_receipt}`);
  console.log(`   Status: DISBURSED`);
  console.log(`   Disbursement ID: ${disbursement.id}`);
  
  console.log('\n🌐 View the results at: http://localhost:3000/loan-tracking');
  console.log('   The loan should now show as "disbursed" in the tracking table!');
}

simulateSuccessfulDisbursement();
