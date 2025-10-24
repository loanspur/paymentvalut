const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

console.log('🔍 Checking Mifos Configuration Storage');
console.log('==================================================\n');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('📋 Step 1: Checking available tables...');
    
    // Check if partners table has Mifos config columns
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .ilike('name', '%umoja%magharibi%')
      .limit(1);
    
    if (partnersError) {
      console.log('❌ Error fetching partners:', partnersError.message);
      return;
    }
    
    if (partners && partners.length > 0) {
      const partner = partners[0];
      console.log('✅ Found partner:', partner.name);
      console.log('📊 Partner columns:');
      Object.keys(partner).forEach(key => {
        if (key.toLowerCase().includes('mifos') || 
            key.toLowerCase().includes('host') || 
            key.toLowerCase().includes('username') || 
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('tenant')) {
          console.log(`   ${key}: ${partner[key] ? '[SET]' : '[EMPTY]'}`);
        }
      });
    }
    
    // Check for other possible tables
    console.log('\n📋 Step 2: Checking for other configuration tables...');
    
    const possibleTables = [
      'mifos_configs',
      'partner_configs', 
      'configurations',
      'settings',
      'mifos_settings'
    ];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table '${tableName}' exists`);
          if (data && data.length > 0) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
          }
        } else {
          console.log(`❌ Table '${tableName}' does not exist`);
        }
      } catch (e) {
        console.log(`❌ Table '${tableName}' does not exist`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function checkPartnerMifosFields() {
  try {
    console.log('\n📋 Step 3: Checking partner table structure...');
    
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .ilike('name', '%umoja%magharibi%')
      .limit(1);
    
    if (partners && partners.length > 0) {
      const partner = partners[0];
      console.log('📊 All partner fields:');
      Object.keys(partner).forEach(key => {
        const value = partner[key];
        if (value !== null && value !== undefined) {
          console.log(`   ${key}: ${typeof value === 'string' && value.length > 50 ? '[LONG STRING]' : value}`);
        } else {
          console.log(`   ${key}: [NULL/UNDEFINED]`);
        }
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function runCheck() {
  console.log('🚀 Starting configuration storage check...\n');
  
  await checkTables();
  await checkPartnerMifosFields();
  
  console.log('\n🏁 Configuration storage check completed');
}

// Run the check
runCheck().catch(error => {
  console.log('\n💥 Check failed:', error.message);
});


