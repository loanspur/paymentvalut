const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAutoDisbursalConfig() {
  console.log('⚙️ Creating Auto-Disbursal Configuration');
  console.log('========================================\n');

  const partnerName = 'Umoja Magharibi';
  const loanProductId = 5; // STAFF LOAN
  const loanProductName = 'STAFF LOAN';

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

  console.log('📋 Partner:', partner.name);
  console.log('📋 Product ID:', loanProductId);
  console.log('📋 Product Name:', loanProductName);

  // First, delete any existing incomplete configurations
  console.log('\n🗑️ Cleaning up existing incomplete configurations...');
  const { error: deleteError } = await supabase
    .from('loan_product_auto_disbursal_configs')
    .delete()
    .eq('partner_id', partner.id)
    .is('loan_product_id', null);

  if (deleteError) {
    console.error('❌ Error deleting incomplete configs:', deleteError.message);
  } else {
    console.log('✅ Cleaned up incomplete configurations');
  }

  // Create new auto-disbursal configuration
  console.log('\n➕ Creating new auto-disbursal configuration...');
  const { data: newConfig, error: insertError } = await supabase
    .from('loan_product_auto_disbursal_configs')
    .insert({
      partner_id: partner.id,
      loan_product_id: loanProductId,
      loan_product_name: loanProductName,
      min_amount: 100,
      max_amount: 10000,
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error creating auto-disbursal config:', insertError.message);
    return;
  }

  console.log('✅ Successfully created auto-disbursal configuration:');
  console.log(`   ID: ${newConfig.id}`);
  console.log(`   Partner: ${partner.name}`);
  console.log(`   Product ID: ${newConfig.loan_product_id}`);
  console.log(`   Product Name: ${newConfig.loan_product_name}`);
  console.log(`   Min Amount: KSh ${newConfig.min_amount.toLocaleString()}`);
  console.log(`   Max Amount: KSh ${newConfig.max_amount.toLocaleString()}`);
  console.log(`   Enabled: ${newConfig.is_enabled}`);

  // Verify the configuration
  console.log('\n🔍 Verifying configuration...');
  const { data: verifyConfig, error: verifyError } = await supabase
    .from('loan_product_auto_disbursal_configs')
    .select('*')
    .eq('partner_id', partner.id)
    .eq('loan_product_id', loanProductId)
    .single();

  if (verifyError) {
    console.error('❌ Error verifying config:', verifyError.message);
  } else {
    console.log('✅ Configuration verified successfully!');
    console.log(`   Found config for product ${verifyConfig.loan_product_id}: ${verifyConfig.loan_product_name}`);
  }

  console.log('\n🎉 Auto-disbursal configuration is now ready!');
  console.log('   Loan 3200 (KSh 3,000) should now be eligible for auto-disbursement.');
}

createAutoDisbursalConfig();


