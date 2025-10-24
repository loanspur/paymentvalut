const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDeployedLoanPolling() {
  console.log('🧪 Testing Deployed Loan Polling Edge Function...\n')
  console.log('=' .repeat(60))

  try {
    // 1. Test the Edge Function directly
    console.log('1️⃣ Testing Edge Function directly...')
    console.log('-'.repeat(40))
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/loan-polling`
    console.log(`📡 Calling: ${edgeFunctionUrl}`)
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-api-key': supabaseServiceKey
      },
      body: JSON.stringify({})
    })

    const result = await response.json()
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      console.log('✅ Edge Function test successful!')
      console.log('📋 Results:')
      console.log(`   Partners checked: ${result.partners_checked || 0}`)
      console.log(`   Loans found: ${result.loans_found || 0}`)
      console.log(`   Loans processed: ${result.loans_processed || 0}`)
      
      if (result.results && result.results.length > 0) {
        console.log('\n📊 Partner Results:')
        result.results.forEach((partnerResult, index) => {
          console.log(`   ${index + 1}. ${partnerResult.partner_name}`)
          console.log(`      Success: ${partnerResult.success ? '✅' : '❌'}`)
          console.log(`      Loans found: ${partnerResult.loans_found || 0}`)
          console.log(`      Loans processed: ${partnerResult.loans_processed || 0}`)
          if (partnerResult.message) {
            console.log(`      Message: ${partnerResult.message}`)
          }
          if (partnerResult.error) {
            console.log(`      Error: ${partnerResult.error}`)
          }
        })
      }
    } else {
      console.log('❌ Edge Function test failed!')
      console.log('📋 Error details:', result)
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // 2. Check recent loan tracking activity
    console.log('2️⃣ Checking recent loan tracking activity...')
    console.log('-'.repeat(40))
    
    const { data: recentLoans, error: loansError } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (loansError) {
      console.log('❌ Error fetching recent loans:', loansError.message)
    } else {
      if (recentLoans.length === 0) {
        console.log('📭 No loan tracking records found')
      } else {
        console.log(`📈 Found ${recentLoans.length} recent loan tracking records:`)
        recentLoans.forEach((loan, index) => {
          const createdTime = new Date(loan.created_at).toLocaleString()
          console.log(`   ${index + 1}. Loan ${loan.loan_id} - ${loan.partners.name}`)
          console.log(`      Status: ${loan.status}`)
          console.log(`      Amount: KSh ${loan.loan_amount}`)
          console.log(`      Created: ${createdTime}`)
        })
      }
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // 3. Check partners configuration
    console.log('3️⃣ Checking partners configuration...')
    console.log('-'.repeat(40))
    
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
      console.log(`✅ Found ${partners.length} active partners with Mifos X configuration:`)
      partners.forEach((partner, index) => {
        console.log(`   ${index + 1}. ${partner.name}`)
        console.log(`      ID: ${partner.id}`)
        console.log(`      Mifos URL: ${partner.mifos_host_url}`)
        console.log(`      Username: ${partner.mifos_username}`)
      })
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // 4. Check auto-disbursal configurations
    console.log('4️⃣ Checking auto-disbursal configurations...')
    console.log('-'.repeat(40))
    
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
      if (autoDisbursalConfigs.length === 0) {
        console.log('📭 No active auto-disbursal configurations found')
      } else {
        console.log(`✅ Found ${autoDisbursalConfigs.length} active auto-disbursal configurations:`)
        autoDisbursalConfigs.forEach((config, index) => {
          console.log(`   ${index + 1}. ${config.partners.name}`)
          console.log(`      Product ID: ${config.product_id}`)
          console.log(`      Product Name: ${config.product_name}`)
          console.log(`      Enabled: ${config.enabled ? '✅' : '❌'}`)
          console.log(`      Max Amount: KSh ${config.max_amount}`)
          console.log(`      Min Amount: KSh ${config.min_amount}`)
        })
      }
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // 5. System health summary
    console.log('5️⃣ System Health Summary...')
    console.log('-'.repeat(40))
    
    const healthChecks = {
      'Edge Function': response.ok ? '✅ Healthy' : '❌ Failed',
      'Partners Config': partners && partners.length > 0 ? '✅ Configured' : '❌ Missing',
      'Auto-Disbursal': autoDisbursalConfigs && autoDisbursalConfigs.length > 0 ? '✅ Configured' : '❌ Missing',
      'Loan Tracking': recentLoans ? '✅ Accessible' : '❌ Error'
    }
    
    Object.entries(healthChecks).forEach(([check, status]) => {
      console.log(`   ${check}: ${status}`)
    })
    
    const allHealthy = Object.values(healthChecks).every(status => status.includes('✅'))
    
    if (allHealthy) {
      console.log('\n🎉 All systems are healthy and ready for cron-job.org setup!')
    } else {
      console.log('\n⚠️ Some systems need attention before setting up cron-job.org')
    }

    console.log('\n' + '='.repeat(60))
    console.log('📋 Next Steps:')
    console.log('1. Set up cron-job.org with the provided configuration')
    console.log('2. Test the cron job with a manual run')
    console.log('3. Monitor the execution logs')
    console.log('4. Set up email alerts for failures')
    console.log('5. Monitor loan discovery and processing')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testDeployedLoanPolling()


