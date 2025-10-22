// Verify partner webhook configuration
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

console.log('🔍 Verifying partner webhook configuration...')
console.log('')

// Get credentials from .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env file!')
  console.log('   Please check your .env file has:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=...')
  console.log('   SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyPartnerWebhookConfig() {
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
          console.log(`   🔧 Action needed: Update webhook URL in partner configuration`)
        }
        
        // Check if auto disbursement is enabled
        if (partner.mifos_auto_disbursement_enabled) {
          console.log(`   ✅ Auto disbursement is enabled`)
        } else {
          console.log(`   ⚠️  Auto disbursement is disabled`)
          console.log(`   🔧 Action needed: Enable auto disbursement in partner configuration`)
        }
      })
    } else {
      console.log('❌ No active partners with Mifos X configured found.')
      console.log('🔧 Action needed: Configure Mifos X settings for at least one partner')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

verifyPartnerWebhookConfig()
