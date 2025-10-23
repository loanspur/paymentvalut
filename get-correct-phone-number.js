const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCorrectPhoneNumber() {
  console.log('📞 Getting Correct Phone Number from Mifos X');
  console.log('============================================\n');

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
  
  // Get loan details
  const loanUrl = `${mifosBaseUrl}/loans/${loanIdToCheck}`;
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
  console.log('📋 Loan Details:');
  console.log(`   Loan ID: ${loanData.id}`);
  console.log(`   Client ID: ${loanData.clientId}`);
  console.log(`   Client Name: ${loanData.clientName}`);

  // Get client details
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

  if (!clientResponse.ok) {
    console.error(`❌ Error fetching client: ${clientResponse.status} ${clientResponse.statusText}`);
    return;
  }

  const clientData = await clientResponse.json();
  console.log('\n📞 Client Details:');
  console.log(`   Display Name: ${clientData.displayName}`);
  console.log(`   Mobile No: ${clientData.mobileNo}`);
  console.log(`   Email: ${clientData.emailAddress}`);
  console.log(`   Account No: ${clientData.accountNo}`);

  // Check if we have a valid phone number
  if (clientData.mobileNo && clientData.mobileNo !== 'N/A' && clientData.mobileNo.length >= 9) {
    console.log('\n✅ Found valid phone number in Mifos X!');
    
    // Format the phone number
    const digits = clientData.mobileNo.replace(/\D/g, '');
    let formattedPhone;
    
    if (digits.startsWith('0')) {
      formattedPhone = '254' + digits.substring(1);
    } else if (digits.startsWith('254')) {
      formattedPhone = digits;
    } else if (digits.length === 9) {
      formattedPhone = '254' + digits;
    } else {
      formattedPhone = digits;
    }
    
    console.log(`   Original: ${clientData.mobileNo}`);
    console.log(`   Formatted: ${formattedPhone}`);
    
    // Validate format
    const msisdnRegex = /^254[0-9]{9}$/;
    const isValid = msisdnRegex.test(formattedPhone);
    console.log(`   Valid: ${isValid}`);
    
    if (isValid) {
      // Update the loan tracking record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('loan_tracking')
        .update({ 
          phone_number: formattedPhone,
          client_name: clientData.displayName,
          updated_at: new Date().toISOString()
        })
        .eq('partner_id', partner.id)
        .eq('loan_id', loanIdToCheck)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating loan record:', updateError.message);
        return;
      }

      console.log('\n🎉 Successfully updated loan tracking record:');
      console.log(`   Loan ID: ${updatedRecord.loan_id}`);
      console.log(`   Client: ${updatedRecord.client_name}`);
      console.log(`   Phone: ${updatedRecord.phone_number}`);
    } else {
      console.log('\n❌ Phone number format is still invalid');
    }
  } else {
    console.log('\n❌ No valid phone number found in Mifos X');
    console.log('   This loan cannot be disbursed via M-Pesa');
  }
}

getCorrectPhoneNumber();

