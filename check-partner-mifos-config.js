// Check partner Mifos X configuration
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPartnerConfig() {
  console.log('🔍 Checking partner Mifos X configuration...')
  
  try {
    // Get all partners
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching partners:', error)
      return
    }

    console.log(`📊 Found ${partners.length} partner(s):`)
    
    partners.forEach((partner, index) => {
      console.log(`\n${index + 1}. Partner: ${partner.name}`)
      console.log(`   ID: ${partner.id}`)
      console.log(`   Active: ${partner.is_active}`)
      console.log(`   Mifos Configured: ${partner.is_mifos_configured}`)
      console.log(`   Mifos Host: ${partner.mifos_host_url || 'Not set'}`)
      console.log(`   Mifos Username: ${partner.mifos_username || 'Not set'}`)
      console.log(`   Mifos Tenant: ${partner.mifos_tenant_id || 'Not set'}`)
      console.log(`   Auto Disbursement: ${partner.mifos_auto_disbursement_enabled}`)
    })

    // Check for active partners with Mifos configured
    const activeMifosPartners = partners.filter(p => 
      p.is_active && p.is_mifos_configured
    )

    console.log(`\n✅ Active partners with Mifos X configured: ${activeMifosPartners.length}`)
    
    if (activeMifosPartners.length === 0) {
      console.log('\n⚠️  No active partners with Mifos X configured found!')
      console.log('Please:')
      console.log('1. Go to Partners page in your application')
      console.log('2. Edit a partner')
      console.log('3. Configure Mifos X settings')
      console.log('4. Enable "Mifos X Integration" checkbox')
      console.log('5. Save the partner')
    } else {
      console.log('\n🎉 Found active Mifos X partners:')
      activeMifosPartners.forEach(partner => {
        console.log(`   - ${partner.name} (${partner.id})`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkPartnerConfig()
