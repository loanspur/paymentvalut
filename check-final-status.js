const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFinalStatus() {
  console.log('📊 Checking Final Status After Simulation');
  console.log('=========================================\n');

  const partnerName = 'Umoja Magharibi';

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

  // Get all loan tracking records for this partner
  const { data: loanRecords, error: loanError } = await supabase
    .from('loan_tracking')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  if (loanError) {
    console.error('❌ Error fetching loan records:', loanError.message);
    return;
  }

  console.log(`📊 Loan Tracking Summary (${loanRecords.length} total records):`);
  console.log('================================================================================');
  
  if (loanRecords.length === 0) {
    console.log('   No loan records found');
  } else {
    loanRecords.forEach((loan, index) => {
      const clientName = loan.client_name ? loan.client_name.substring(0, 25).padEnd(25, ' ') : 'N/A'.padEnd(25, ' ');
      const amount = `KSh ${loan.loan_amount.toLocaleString()}`.padEnd(15, ' ');
      const status = loan.status.padEnd(20, ' ');
      const receipt = loan.mpesa_receipt_number ? loan.mpesa_receipt_number.substring(0, 15).padEnd(15, ' ') : 'N/A'.padEnd(15, ' ');
      const createdAt = new Date(loan.created_at).toLocaleDateString('en-GB').padEnd(12, ' ');
      
      console.log(`| ${String(loan.loan_id).padEnd(7, ' ')} | ${clientName} | ${amount} | ${status} | ${receipt} | ${createdAt} |`);
    });
  }
  console.log('================================================================================\n');

  // Get disbursement records
  const { data: disbursements, error: disbursementError } = await supabase
    .from('disbursement_requests')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (disbursementError) {
    console.error('❌ Error fetching disbursement records:', disbursementError.message);
  } else {
    console.log(`📱 Recent Disbursements (${disbursements.length} records):`);
    console.log('================================================================================');
    
    if (disbursements.length === 0) {
      console.log('   No disbursement records found');
    } else {
      disbursements.forEach((disbursement, index) => {
        const amount = `KSh ${disbursement.amount.toLocaleString()}`.padEnd(15, ' ');
        const status = disbursement.status.padEnd(12, ' ');
        const receipt = disbursement.transaction_receipt ? disbursement.transaction_receipt.substring(0, 15).padEnd(15, ' ') : 'N/A'.padEnd(15, ' ');
        const createdAt = new Date(disbursement.created_at).toLocaleDateString('en-GB').padEnd(12, ' ');
        
        console.log(`| ${String(disbursement.id).substring(0, 8).padEnd(8, ' ')} | ${amount} | ${status} | ${receipt} | ${createdAt} |`);
      });
    }
  }
  console.log('================================================================================\n');

  // Summary
  const disbursedLoans = loanRecords.filter(loan => loan.status === 'disbursed');
  const pendingLoans = loanRecords.filter(loan => loan.status === 'pending_disbursement');
  const failedLoans = loanRecords.filter(loan => loan.status === 'failed');

  console.log('📊 STATUS SUMMARY:');
  console.log(`   ✅ Disbursed: ${disbursedLoans.length} loans`);
  console.log(`   ⏳ Pending: ${pendingLoans.length} loans`);
  console.log(`   ❌ Failed: ${failedLoans.length} loans`);
  console.log(`   📱 Total Disbursements: ${disbursements.length}`);

  if (disbursedLoans.length > 0) {
    console.log('\n🎉 SUCCESSFUL DISBURSEMENTS:');
    disbursedLoans.forEach(loan => {
      console.log(`   • Loan ${loan.loan_id}: ${loan.client_name} - KSh ${loan.loan_amount.toLocaleString()} (Receipt: ${loan.mpesa_receipt_number})`);
    });
  }

  console.log('\n🌐 View the complete dashboard at: http://localhost:3000/loan-tracking');
  console.log('   You should see loan 3200 marked as "disbursed" with M-Pesa receipt number!');
}

checkFinalStatus();

