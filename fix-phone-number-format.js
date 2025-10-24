const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function formatPhoneNumber(phoneNumber) {
  // Remove any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 0, replace with 254
  if (digits.startsWith('0')) {
    return '254' + digits.substring(1);
  }
  
  // If it starts with 254, return as is
  if (digits.startsWith('254')) {
    return digits;
  }
  
  // If it's 9 digits, add 254 prefix
  if (digits.length === 9) {
    return '254' + digits;
  }
  
  // Return as is if it's already 12 digits
  if (digits.length === 12) {
    return digits;
  }
  
  // Default: assume it needs 254 prefix
  return '254' + digits;
}

async function fixPhoneNumberFormat() {
  console.log('📱 Fixing Phone Number Format for Loan 3200');
  console.log('===========================================\n');

  const partnerName = 'Umoja Magharibi';
  const loanIdToFix = 3200;

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

  // Get current loan record
  const { data: loanRecord, error: loanError } = await supabase
    .from('loan_tracking')
    .select('*')
    .eq('partner_id', partner.id)
    .eq('loan_id', loanIdToFix)
    .single();

  if (loanError) {
    console.error('❌ Error fetching loan record:', loanError.message);
    return;
  }

  console.log('📋 Current phone number:', loanRecord.phone_number);
  
  const formattedPhone = formatPhoneNumber(loanRecord.phone_number);
  console.log('📱 Formatted phone number:', formattedPhone);
  
  // Validate the format
  const msisdnRegex = /^254[0-9]{9}$/;
  const isValid = msisdnRegex.test(formattedPhone);
  console.log('✅ Valid format:', isValid);
  
  if (!isValid) {
    console.error('❌ Phone number cannot be formatted correctly');
    return;
  }

  // Update the phone number
  const { data: updatedRecord, error: updateError } = await supabase
    .from('loan_tracking')
    .update({ 
      phone_number: formattedPhone,
      updated_at: new Date().toISOString()
    })
    .eq('id', loanRecord.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating phone number:', updateError.message);
    return;
  }

  console.log('✅ Successfully updated phone number:');
  console.log(`   Loan ID: ${updatedRecord.loan_id}`);
  console.log(`   Client: ${updatedRecord.client_name}`);
  console.log(`   Old Phone: ${loanRecord.phone_number}`);
  console.log(`   New Phone: ${updatedRecord.phone_number}`);
  console.log('\n🎉 Phone number is now in the correct format for M-Pesa!');
}

fixPhoneNumberFormat();


