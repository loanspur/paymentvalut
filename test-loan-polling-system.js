const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testLoanPollingSystem() {
  console.log('🧪 Testing Loan Polling System...\n')

  try {
    // 1. Test the API endpoint
    console.log('1️⃣ Testing loan polling API endpoint...')
    const apiUrl = 'http://localhost:3000/api/cron/loan-polling'
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || 'test-secret'
      },
      body: JSON.stringify({})
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ API endpoint test successful')
      console.log('📊 Results:', JSON.stringify(result, null, 2))
    } else {
      console.log('❌ API endpoint test failed:', result)
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // 2. Test direct Edge Function call
    console.log('2️⃣ Testing direct Edge Function call...')
    
    const edgeFunctionResponse = await fetch(`${supabaseUrl}/functions/v1/loan-polling`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-api-key': supabaseServiceKey
      },
      body: JSON.stringify({})
    })

    const edgeFunctionResult = await edgeFunctionResponse.json()
    
    if (edgeFunctionResponse.ok) {
      console.log('✅ Edge Function test successful')
      console.log('📊 Results:', JSON.stringify(edgeFunctionResult, null, 2))
    } else {
      console.log('❌ Edge Function test failed:', edgeFunctionResult)
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // 3. Check loan tracking table for new records
    console.log('3️⃣ Checking loan tracking table for new records...')
    
    const { data: recentLoans, error: loansError } = await supabase
      .from('loan_tracking')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (loansError) {
      console.log('❌ Error fetching loan tracking records:', loansError.message)
    } else {
      console.log(`✅ Found ${recentLoans.length} recent loan tracking records`)
      if (recentLoans.length > 0) {
        console.log('📋 Recent loans:')
        recentLoans.forEach((loan, index) => {
          console.log(`   ${index + 1}. Loan ID: ${loan.loan_id}, Status: ${loan.status}, Partner: ${loan.partner_id}`)
        })
      }
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // 4. Check partners with Mifos X configuration
    console.log('4️⃣ Checking partners with Mifos X configuration...')
    
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select(`
        id,
        name,
        mifos_host_url,
        mifos_username,
        is_active
      `)
      .eq('is_active', true)
      .not('mifos_host_url', 'is', null)
      .not('mifos_username', 'is', null)

    if (partnersError) {
      console.log('❌ Error fetching partners:', partnersError.message)
    } else {
      console.log(`✅ Found ${partners.length} active partners with Mifos X configuration`)
      partners.forEach((partner, index) => {
        console.log(`   ${index + 1}. ${partner.name} (ID: ${partner.id})`)
        console.log(`      Mifos URL: ${partner.mifos_host_url}`)
        console.log(`      Username: ${partner.mifos_username}`)
      })
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // 5. Check auto-disbursal configurations
    console.log('5️⃣ Checking auto-disbursal configurations...')
    
    const { data: autoDisbursalConfigs, error: configError } = await supabase
      .from('loan_product_auto_disbursal_configs')
      .select(`
        *,
        partners!inner(name)
      `)
      .eq('enabled', true)

    if (configError) {
      console.log('❌ Error fetching auto-disbursal configs:', configError.message)
    } else {
      console.log(`✅ Found ${autoDisbursalConfigs.length} active auto-disbursal configurations`)
      autoDisbursalConfigs.forEach((config, index) => {
        console.log(`   ${index + 1}. Partner: ${config.partners.name}`)
        console.log(`      Loan Product ID: ${config.product_id}`)
        console.log(`      Auto-disbursal: ${config.enabled ? 'Enabled' : 'Disabled'}`)
      })
    }

    console.log('\n🎉 Loan polling system test completed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testLoanPollingSystem()