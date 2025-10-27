require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPartnerCase() {
  console.log('🔍 Checking partner case sensitivity...');
  
  // Check UMOJA partner
  const { data: umojaPartner, error: umojaError } = await supabase
    .from('partners')
    .select('id, name, short_code, is_active')
    .eq('short_code', 'UMOJA')
    .single();
    
  if (umojaError) {
    console.error('UMOJA partner error:', umojaError);
  } else {
    console.log('✅ UMOJA partner found:', umojaPartner);
  }
  
  // Check umoja partner (lowercase)
  const { data: umojaLowerPartner, error: umojaLowerError } = await supabase
    .from('partners')
    .select('id, name, short_code, is_active')
    .eq('short_code', 'umoja')
    .single();
    
  if (umojaLowerError) {
    console.error('umoja partner error:', umojaLowerError);
  } else {
    console.log('✅ umoja partner found:', umojaLowerPartner);
  }
  
  // Check all partners with UMOJA in the name
  const { data: allUmojaPartners, error: allError } = await supabase
    .from('partners')
    .select('id, name, short_code, is_active')
    .ilike('short_code', '%umoja%');
    
  if (allError) {
    console.error('All UMOJA partners error:', allError);
  } else {
    console.log('📊 All partners with UMOJA in short_code:', allUmojaPartners);
  }
}

checkPartnerCase();
