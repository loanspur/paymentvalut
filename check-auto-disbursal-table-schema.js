const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAutoDisbursalTableSchema() {
  console.log('🔍 Checking Auto-Disbursal Table Schema');
  console.log('=======================================\n');

  // Get all records to see what columns exist
  const { data: records, error: fetchError } = await supabase
    .from('loan_product_auto_disbursal_configs')
    .select('*')
    .limit(1);

  if (fetchError) {
    console.error('❌ Error fetching records:', fetchError.message);
    return;
  }

  if (records && records.length > 0) {
    console.log('📋 Existing record structure:');
    const record = records[0];
    Object.keys(record).forEach(key => {
      console.log(`   ${key}: ${record[key]} (${typeof record[key]})`);
    });
  } else {
    console.log('📋 No records found in the table');
  }

  // Try to get all records to see the full structure
  const { data: allRecords, error: allError } = await supabase
    .from('loan_product_auto_disbursal_configs')
    .select('*');

  if (allError) {
    console.error('❌ Error fetching all records:', allError.message);
  } else {
    console.log(`\n📊 Total records: ${allRecords.length}`);
    if (allRecords.length > 0) {
      console.log('\n📋 All records:');
      allRecords.forEach((record, index) => {
        console.log(`\n   Record ${index + 1}:`);
        Object.keys(record).forEach(key => {
          console.log(`     ${key}: ${record[key]}`);
        });
      });
    }
  }
}

checkAutoDisbursalTableSchema();


