require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPartnersAndCreateTest() {
  console.log('🔍 Checking Partners and Creating Test Partner')
  console.log('==============================================\n')

  try {
    // Check existing partners
    console.log('📋 Checking existing partners...')
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')

    if (partnersError) {
      console.error('❌ Error fetching partners:', partnersError)
      return
    }

    console.log(`✅ Found ${partners.length} partners in database`)
    
    if (partners.length > 0) {
      console.log('\n📊 Existing Partners:')
      partners.forEach((partner, index) => {
        console.log(`   ${index + 1}. ${partner.name} (ID: ${partner.id})`)
        console.log(`      Active: ${partner.is_active ? '✅' : '❌'}`)
        console.log(`      NCBA Consumer Key: ${partner.ncba_consumer_key ? '✅' : '❌'}`)
        console.log(`      NCBA Consumer Secret: ${partner.ncba_consumer_secret ? '✅' : '❌'}`)
        console.log(`      NCBA Passkey: ${partner.ncba_passkey ? '✅' : '❌'}`)
        console.log(`      NCBA Business Short Code: ${partner.ncba_business_short_code || 'Not set'}`)
        console.log('')
      })
    } else {
      console.log('❌ No partners found. Creating test partner...')
      
      // Create test partner with NCBA credentials
      const testPartner = {
        name: 'Test Partner',
        contact_email: 'test@example.com',
        contact_phone: '254700000000',
        is_active: true,
        tenant_id: 'test_tenant',
        mpesa_consumer_key: 'test_mpesa_key',
        mpesa_consumer_secret: 'test_mpesa_secret',
        mpesa_passkey: 'test_mpesa_passkey',
        mpesa_business_short_code: '174379',
        ncba_consumer_key: 'test_ncba_key',
        ncba_consumer_secret: 'test_ncba_secret',
        ncba_passkey: 'test_ncba_passkey',
        ncba_business_short_code: '174379',
        mifos_host_url: 'https://system.loanspur.com',
        mifos_username: 'admin',
        mifos_password: 'Atata$$2020',
        mifos_tenant_id: 'umoja',
        mifos_api_endpoint: '/fineract-provider/api/v1',
        mifos_auto_disbursement_enabled: true,
        is_mifos_configured: true,
        webhook_url: 'http://localhost:3000/api/mifos/webhook/loan-approval',
        webhook_secret_token: 'test_webhook_token',
        sms_notifications_enabled: true,
        sms_phone_numbers: ['254700000000']
      }

      const { data: newPartner, error: createError } = await supabase
        .from('partners')
        .insert(testPartner)
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating test partner:', createError)
        return
      }

      console.log('✅ Test partner created successfully!')
      console.log(`   ID: ${newPartner.id}`)
      console.log(`   Name: ${newPartner.name}`)
      console.log(`   Email: ${newPartner.contact_email}`)
    }

    // Check if any partner has complete NCBA configuration
    const partnersWithNCBA = partners.filter(p => 
      p.ncba_consumer_key && 
      p.ncba_consumer_secret && 
      p.ncba_passkey
    )

    if (partnersWithNCBA.length === 0) {
      console.log('\n⚠️  No partners have complete NCBA configuration.')
      console.log('   To test STK Push, you need to configure NCBA credentials for a partner.')
      console.log('   You can do this through the partner configuration form in the UI.')
    } else {
      console.log(`\n✅ ${partnersWithNCBA.length} partner(s) have complete NCBA configuration.`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the check
checkPartnersAndCreateTest()


