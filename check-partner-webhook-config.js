// Check partner webhook configuration
const { createClient } = require('@supabase/supabase-js')

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co' // Replace with your URL
const supabaseKey = 'your-service-role-key' // Replace with your service role key

console.log('🔍 Checking partner webhook configuration...')
console.log('📝 Note: Please update the Supabase credentials in this script first')
console.log('')

if (supabaseUrl.includes('your-project') || supabaseKey.includes('your-service-role')) {
  console.log('❌ Please update the Supabase credentials in this script first')
  console.log('   You can find these in your Supabase project settings')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPartnerWebhookConfig() {
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
        console.log(`   Webhook URL: ${partner.mifos_webhook_url}`)
        console.log(`   Auto Disbursement Enabled: ${partner.mifos_auto_disbursement_enabled}`)
        console.log(`   Is Active: ${partner.is_active}`)
        console.log(`   Is Mifos Configured: ${partner.is_mifos_configured}`)
        
        // Check if webhook URL is correct
        const expectedWebhookUrl = 'https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval'
        if (partner.mifos_webhook_url === expectedWebhookUrl) {
          console.log(`   ✅ Webhook URL is correct`)
        } else {
          console.log(`   ❌ Webhook URL mismatch!`)
          console.log(`   Expected: ${expectedWebhookUrl}`)
          console.log(`   Current:  ${partner.mifos_webhook_url}`)
        }
      })
    } else {
      console.log('No active partners with Mifos X configured found.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkPartnerWebhookConfig()
