require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPartnerData() {
  console.log('🔍 Checking partner data in transactions...');
  
  // Get recent transactions with partner info
  const { data: transactions, error } = await supabase
    .from('c2b_transactions')
    .select('id, transaction_id, partner_id, bill_reference_number, customer_name, amount')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('📊 Recent transactions with partner data:');
  transactions.forEach(t => {
    console.log(`- ${t.transaction_id}: partner_id=${t.partner_id}, bill_ref=${t.bill_reference_number}`);
  });
  
  // Get UMOJA partner info
  const { data: umojaPartner, error: partnerError } = await supabase
    .from('partners')
    .select('id, name, short_code')
    .eq('short_code', 'UMOJA')
    .single();
    
  if (partnerError) {
    console.error('UMOJA partner error:', partnerError);
  } else {
    console.log('🎯 UMOJA partner:', umojaPartner);
  }
  
  // Test the API endpoint
  console.log('\n🧪 Testing API endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/c2b/transactions');
    const apiData = await response.json();
    
    if (apiData.success && apiData.data) {
      console.log('📡 API Response sample:');
      apiData.data.slice(0, 2).forEach(t => {
        console.log(`- ${t.transaction_id}: partner_name=${t.partner_name}, partner_short_code=${t.partner_short_code}`);
      });
    }
  } catch (error) {
    console.log('API test failed (server not running locally):', error.message);
  }
}

checkPartnerData();
