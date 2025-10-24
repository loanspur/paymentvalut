const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAutoDisbursalConfig() {
  console.log('🔍 Checking Auto-Disbursal Configuration');
  console.log('========================================\n');

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

  console.log('📋 Partner Configuration:');
  console.log(`   Name: ${partner.name}`);
  console.log(`   ID: ${partner.id}`);
  console.log(`   Is Active: ${partner.is_active}`);
  console.log(`   Mifos Configured: ${partner.is_mifos_configured}`);
  console.log(`   Auto Disbursement Enabled: ${partner.mifos_auto_disbursement_enabled}`);
  console.log(`   Tenant ID: ${partner.tenant_id}`);

  // Check if auto-disbursal is enabled
  if (!partner.mifos_auto_disbursement_enabled) {
    console.log('\n❌ Auto-disbursement is NOT enabled for this partner!');
    console.log('   Please enable auto-disbursement in the partner configuration.');
    return;
  }

  // Check auto-disbursal configurations
  console.log('\n📋 Checking auto-disbursal configurations...');
  const { data: autoDisbursalConfigs, error: configError } = await supabase
    .from('loan_product_auto_disbursal_configs')
    .select('*')
    .eq('partner_id', partner.id);

  if (configError) {
    console.error('❌ Error fetching auto-disbursal configs:', configError.message);
    return;
  }

  console.log(`📊 Found ${autoDisbursalConfigs.length} auto-disbursal configurations:`);
  
  if (autoDisbursalConfigs.length === 0) {
    console.log('❌ No auto-disbursal configurations found!');
    console.log('   Please configure auto-disbursal settings for loan products.');
    return;
  }

  autoDisbursalConfigs.forEach((config, index) => {
    console.log(`\n   ${index + 1}. Product ID: ${config.loan_product_id}`);
    console.log(`      Product Name: ${config.loan_product_name}`);
    console.log(`      Min Amount: KSh ${config.min_amount.toLocaleString()}`);
    console.log(`      Max Amount: KSh ${config.max_amount.toLocaleString()}`);
    console.log(`      Enabled: ${config.is_enabled}`);
  });

  // Check if we have a configuration for the specific loan product
  console.log('\n📋 Checking configuration for loan 3200...');
  
  // Get loan details from Mifos X to find the product ID
  const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64');
  const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`;
  
  const loanUrl = `${mifosBaseUrl}/loans/3200`;
  const loanResponse = await fetch(loanUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Fineract-Platform-TenantId': partner.mifos_tenant_id,
      'Authorization': `Basic ${basicAuth}`
    }
  });

  if (loanResponse.ok) {
    const loanData = await loanResponse.json();
    console.log(`   Loan Product ID: ${loanData.loanProductId}`);
    console.log(`   Loan Product Name: ${loanData.loanProductName}`);
    console.log(`   Loan Amount: KSh ${loanData.principal.toLocaleString()}`);
    
    // Check if we have a config for this product
    const productConfig = autoDisbursalConfigs.find(config => 
      config.loan_product_id === loanData.loanProductId
    );
    
    if (productConfig) {
      console.log('\n✅ Found auto-disbursal configuration for this product!');
      console.log(`   Min Amount: KSh ${productConfig.min_amount.toLocaleString()}`);
      console.log(`   Max Amount: KSh ${productConfig.max_amount.toLocaleString()}`);
      console.log(`   Enabled: ${productConfig.is_enabled}`);
      
      if (productConfig.is_enabled && 
          loanData.principal >= productConfig.min_amount && 
          loanData.principal <= productConfig.max_amount) {
        console.log('✅ Loan amount is within auto-disbursal limits!');
      } else {
        console.log('❌ Loan amount is outside auto-disbursal limits or config is disabled!');
      }
    } else {
      console.log('\n❌ No auto-disbursal configuration found for this loan product!');
      console.log('   Please create an auto-disbursal configuration for this product.');
    }
  } else {
    console.log('❌ Could not fetch loan details from Mifos X');
  }
}

checkAutoDisbursalConfig();


