const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateMifosLoanActivation() {
  console.log('🏦 Simulating Mifos X Loan Activation');
  console.log('=====================================\n');

  const partnerName = 'Umoja Magharibi';
  const loanIdToActivate = 3200;

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

  // Get the disbursement record we just created
  const { data: disbursement, error: disbursementError } = await supabase
    .from('disbursement_requests')
    .select('*')
    .eq('external_reference', loanIdToActivate.toString())
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (disbursementError) {
    console.error('❌ Error fetching disbursement record:', disbursementError.message);
    return;
  }

  console.log('📋 Disbursement Details:');
  console.log(`   Disbursement ID: ${disbursement.id}`);
  console.log(`   Receipt: ${disbursement.transaction_receipt}`);
  console.log(`   Amount: KSh ${disbursement.transaction_amount.toLocaleString()}`);
  console.log(`   Date: ${disbursement.transaction_date}`);

  const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
  const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`;

  // Step 1: Get current loan status
  console.log('\n📋 Step 1: Getting current loan status from Mifos X...');
  const loanUrl = `${mifosBaseUrl}/loans/${loanIdToActivate}`;
  
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

  const currentLoanData = await loanResponse.json();
  console.log('📊 Current Loan Status:');
  console.log(`   Loan ID: ${currentLoanData.id}`);
  console.log(`   Client: ${currentLoanData.clientName}`);
  console.log(`   Amount: KSh ${currentLoanData.principal.toLocaleString()}`);
  console.log(`   Status ID: ${currentLoanData.status?.id}`);
  console.log(`   Status Value: ${currentLoanData.status?.value}`);
  console.log(`   Waiting for Disbursal: ${currentLoanData.status?.waitingForDisbursal}`);
  console.log(`   Disbursed Date: ${currentLoanData.timeline?.disbursedOnDate?.join('/') || 'Not disbursed'}`);

  // Step 2: Simulate loan activation API call
  console.log('\n🔄 Step 2: Simulating loan activation API call...');
  
  const activationUrl = `${mifosBaseUrl}/loans/${loanIdToActivate}?command=disburseToSavings&tenantIdentifier=${partner.mifos_tenant_id}`;
  const activationPayload = {
    locale: 'en',
    dateFormat: 'dd MMMM yyyy',
    actualDisbursementDate: disbursement.transaction_date,
    note: `Disbursed via Payment Vault system. M-Pesa Receipt: ${disbursement.transaction_receipt}. Transaction ID: ${disbursement.conversation_id}`
  };

  console.log('📤 Activation Request Details:');
  console.log(`   URL: ${activationUrl}`);
  console.log(`   Method: POST`);
  console.log(`   Payload:`, JSON.stringify(activationPayload, null, 2));

  // In a real scenario, this would be the actual API call:
  /*
  const activationResponse = await fetch(activationUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Fineract-Platform-TenantId': partner.mifos_tenant_id,
      'Authorization': `Basic ${basicAuth}`
    },
    body: JSON.stringify(activationPayload)
  });
  */

  console.log('\n🎭 SIMULATION MODE - Not making actual API call');
  console.log('   In production, this would:');
  console.log('   1. ✅ Send POST request to Mifos X');
  console.log('   2. ✅ Update loan status from "Approved" (200) to "Active" (300)');
  console.log('   3. ✅ Record disbursement date and amount');
  console.log('   4. ✅ Add transaction note with M-Pesa receipt');
  console.log('   5. ✅ Update loan timeline');

  // Step 3: Show what the updated loan would look like
  console.log('\n📊 Step 3: Expected updated loan status...');
  console.log('📋 After successful activation, the loan would have:');
  console.log(`   Status ID: 300 (Active)`);
  console.log(`   Status Value: Active`);
  console.log(`   Waiting for Disbursal: false`);
  console.log(`   Active: true`);
  console.log(`   Disbursed Date: ${disbursement.transaction_date}`);
  console.log(`   Disbursed Amount: KSh ${disbursement.transaction_amount.toLocaleString()}`);
  console.log(`   Transaction Note: Disbursed via Payment Vault system. M-Pesa Receipt: ${disbursement.transaction_receipt}`);

  // Step 4: Show transaction history
  console.log('\n📋 Step 4: Expected transaction history...');
  console.log('📊 The loan would have a new transaction record:');
  console.log(`   Transaction Type: Disbursement`);
  console.log(`   Amount: KSh ${disbursement.transaction_amount.toLocaleString()}`);
  console.log(`   Date: ${disbursement.transaction_date}`);
  console.log(`   Reference: ${disbursement.transaction_receipt}`);
  console.log(`   Note: Disbursed via Payment Vault system`);

  // Step 5: Show how to verify the activation
  console.log('\n🔍 Step 5: How to verify loan activation...');
  console.log('📋 To verify the loan was activated, you can:');
  console.log('   1. Check loan status: GET /loans/3200');
  console.log('   2. Check loan transactions: GET /loans/3200/transactions');
  console.log('   3. Check loan timeline: GET /loans/3200 (timeline section)');
  console.log('   4. Verify in Mifos X UI: Loans → View Loan → Status should be "Active"');

  console.log('\n🎉 SIMULATION COMPLETE!');
  console.log('========================');
  console.log('✅ Loan activation process demonstrated');
  console.log('✅ M-Pesa receipt integration shown');
  console.log('✅ Transaction note with receipt number');
  console.log('✅ Complete audit trail established');
  
  console.log('\n💡 Key Points:');
  console.log('   • The system updates both local tracking AND Mifos X');
  console.log('   • M-Pesa receipt number is recorded in Mifos X transaction notes');
  console.log('   • Complete audit trail from M-Pesa → Payment Vault → Mifos X');
  console.log('   • Loan status changes from "Approved" to "Active"');
  console.log('   • Disbursement date and amount are recorded in Mifos X');
}

simulateMifosLoanActivation();


