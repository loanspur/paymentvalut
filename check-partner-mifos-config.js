// Script to check partner Mifos X configuration
const { createClient } = require('@supabase/supabase-js')

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co' // Replace with your URL
const supabaseKey = 'your-service-role-key' // Replace with your service role key

console.log('🔍 Checking partner Mifos X configuration...')
console.log('📝 Note: Please update the Supabase credentials in this script first')
console.log('')

if (supabaseUrl.includes('your-project') || supabaseKey.includes('your-service-role')) {
  console.log('❌ Please update the Supabase credentials in this script first')
  console.log('   You can find these in your Supabase project settings')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPartnerConfig() {
  try {
    console.log('📊 Checking partners with Mifos X configuration...')
    
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .eq('is_mifos_configured', true)
      .eq('is_active', true)

    if (partnersError) {
      console.error('❌ Error fetching partners:', partnersError.message)
      return
    }

    console.log(`📊 Found ${partners?.length || 0} active partners with Mifos X configured:`)
    
    if (partners && partners.length > 0) {
      partners.forEach((partner, index) => {
        console.log(`\n${index + 1}. Partner: ${partner.name}`)
        console.log(`   ID: ${partner.id}`)
        console.log(`   Mifos Host URL: ${partner.mifos_host_url}`)
        console.log(`   Mifos Username: ${partner.mifos_username}`)
        console.log(`   Mifos Tenant ID: ${partner.mifos_tenant_id}`)
        console.log(`   Mifos API Endpoint: ${partner.mifos_api_endpoint}`)
        console.log(`   Webhook URL: ${partner.mifos_webhook_url}`)
        console.log(`   Auto Disbursement Enabled: ${partner.mifos_auto_disbursement_enabled}`)
        console.log(`   Max Disbursement Amount: ${partner.mifos_max_disbursement_amount}`)
        console.log(`   Min Disbursement Amount: ${partner.mifos_min_disbursement_amount}`)
        console.log(`   Is Active: ${partner.is_active}`)
        console.log(`   Is Mifos Configured: ${partner.is_mifos_configured}`)
      })
    } else {
      console.log('No active partners with Mifos X configured found.')
    }

    console.log('\n' + '=' .repeat(80))
    console.log('📊 Checking auto-disbursal configurations...')
    
    const { data: autoDisbursalConfigs, error: configError } = await supabase
      .from('loan_product_auto_disbursal_configs')
      .select(`
        *,
        partners(name)
      `)
      .eq('enabled', true)

    if (configError) {
      console.error('❌ Error fetching auto-disbursal configs:', configError.message)
    } else {
      console.log(`📊 Found ${autoDisbursalConfigs?.length || 0} enabled auto-disbursal configurations:`)
      
      if (autoDisbursalConfigs && autoDisbursalConfigs.length > 0) {
        autoDisbursalConfigs.forEach((config, index) => {
          console.log(`\n${index + 1}. Product ID: ${config.product_id}`)
          console.log(`   Product Name: ${config.product_name}`)
          console.log(`   Partner: ${config.partners?.name || 'Unknown'}`)
          console.log(`   Enabled: ${config.enabled}`)
          console.log(`   Auto Approve: ${config.auto_approve}`)
          console.log(`   Min Amount: ${config.min_amount}`)
          console.log(`   Max Amount: ${config.max_amount}`)
          console.log(`   Requires Approval: ${config.requires_approval}`)
        })
      } else {
        console.log('No enabled auto-disbursal configurations found.')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkPartnerConfig()