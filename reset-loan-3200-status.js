const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetLoan3200Status() {
  console.log('🔄 Resetting Loan 3200 Status');
  console.log('==============================\n');

  const partnerName = 'Umoja Magharibi';
  const loanIdToReset = 3200;

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

  // Reset loan status to pending_disbursement
  const { data: updatedRecord, error: updateError } = await supabase
    .from('loan_tracking')
    .update({ 
      status: 'pending_disbursement',
      disbursement_status: null,
      disbursement_id: null,
      mpesa_receipt_number: null,
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq('partner_id', partner.id)
    .eq('loan_id', loanIdToReset)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error resetting loan status:', updateError.message);
    return;
  }

  console.log('✅ Successfully reset loan 3200 status:');
  console.log(`   Loan ID: ${updatedRecord.loan_id}`);
  console.log(`   Client: ${updatedRecord.client_name}`);
  console.log(`   Amount: KSh ${updatedRecord.loan_amount.toLocaleString()}`);
  console.log(`   Status: ${updatedRecord.status}`);
  console.log(`   Phone: ${updatedRecord.phone_number}`);
  console.log('\n🎉 Loan 3200 is now ready for disbursement testing!');
}

resetLoan3200Status();

