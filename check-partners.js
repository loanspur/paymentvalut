const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPartners() {
  console.log('🔍 Checking all partners...');
  
  const { data: partners, error } = await supabase
    .from('partners')
    .select('id, name, short_code, is_active')
    .order('name');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('📋 All partners:');
    partners.forEach(p => {
      console.log(`- ${p.name} (${p.short_code}) - ${p.is_active ? 'Active' : 'Inactive'}`);
    });
    
    // Check specifically for FINSA variations
    console.log('\n🔍 Looking for FINSA variations...');
    const finsaVariations = partners.filter(p => 
      p.short_code.toLowerCase().includes('finsa') || 
      p.name.toLowerCase().includes('finsa')
    );
    
    if (finsaVariations.length > 0) {
      console.log('✅ Found FINSA variations:');
      finsaVariations.forEach(p => {
        console.log(`- ${p.name} (${p.short_code})`);
      });
    } else {
      console.log('❌ No FINSA variations found');
    }
  }
}

checkPartners().catch(console.error);
