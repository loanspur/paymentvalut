const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function monitorLoanPolling() {
  console.log('📊 Loan Polling System Monitor\n')
  console.log('=' .repeat(60))

  try {
    // 1. Check recent loan tracking activity
    console.log('\n📋 Recent Loan Tracking Activity (Last 24 hours):')
    console.log('-'.repeat(50))
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: recentLoans, error: loansError } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners!inner(name)
      `)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })

    if (loansError) {
      console.log('❌ Error fetching recent loans:', loansError.message)
    } else {
      if (recentLoans.length === 0) {
        console.log('📭 No loan tracking records created in the last 24 hours')
      } else {
        console.log(`📈 Found ${recentLoans.length} loan tracking records created in the last 24 hours`)
        
        // Group by status
        const statusCounts = recentLoans.reduce((acc, loan) => {
          acc[loan.status] = (acc[loan.status] || 0) + 1
          return acc
        }, {})
        
        console.log('\n📊 Status breakdown:')
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count} loans`)
        })
        
        // Show recent loans
        console.log('\n🕒 Most recent loans:')
        recentLoans.slice(0, 5).forEach((loan, index) => {
          const createdTime = new Date(loan.created_at).toLocaleString()
          console.log(`   ${index + 1}. Loan ${loan.loan_id} - ${loan.partners.name} (${loan.status}) - ${createdTime}`)
        })
      }
    }

    // 2. Check partners configuration
    console.log('\n\n🏢 Partners with Mifos X Configuration:')
    console.log('-'.repeat(50))
    
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select(`
        id,
        name,
        mifos_host_url,
        mifos_username,
        is_active,
        created_at
      `)
      .eq('is_active', true)
      .not('mifos_host_url', 'is', null)
      .not('mifos_username', 'is', null)
      .order('name')

    if (partnersError) {
      console.log('❌ Error fetching partners:', partnersError.message)
    } else {
      console.log(`✅ ${partners.length} active partners with Mifos X configuration:`)
      partners.forEach((partner, index) => {
        console.log(`   ${index + 1}. ${partner.name}`)
        console.log(`      ID: ${partner.id}`)
        console.log(`      Mifos URL: ${partner.mifos_host_url}`)
        console.log(`      Username: ${partner.mifos_username}`)
        console.log(`      Active: ${partner.is_active ? 'Yes' : 'No'}`)
        console.log('')
      })
    }

    // 3. Check auto-disbursal configurations
    console.log('\n🚀 Auto-Disbursal Configurations:')
    console.log('-'.repeat(50))
    
    const { data: autoDisbursalConfigs, error: configError } = await supabase
      .from('loan_product_auto_disbursal_configs')
      .select(`
        *,
        partners!inner(name)
      `)
      .eq('enabled', true)
      .order('created_at', { ascending: false })

    if (configError) {
      console.log('❌ Error fetching auto-disbursal configs:', configError.message)
    } else {
      if (autoDisbursalConfigs.length === 0) {
        console.log('📭 No active auto-disbursal configurations found')
      } else {
        console.log(`✅ ${autoDisbursalConfigs.length} active auto-disbursal configurations:`)
        autoDisbursalConfigs.forEach((config, index) => {
          console.log(`   ${index + 1}. ${config.partners.name}`)
          console.log(`      Loan Product ID: ${config.product_id}`)
          console.log(`      Auto-disbursal: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`)
          console.log(`      Created: ${new Date(config.created_at).toLocaleDateString()}`)
          console.log('')
        })
      }
    }

    // 4. Check recent disbursement activity
    console.log('\n💰 Recent Disbursement Activity (Last 24 hours):')
    console.log('-'.repeat(50))
    
    const { data: recentDisbursements, error: disbursementsError } = await supabase
      .from('disbursement_requests')
      .select(`
        *,
        partners!inner(name)
      `)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })

    if (disbursementsError) {
      console.log('❌ Error fetching recent disbursements:', disbursementsError.message)
    } else {
      if (recentDisbursements.length === 0) {
        console.log('📭 No disbursements processed in the last 24 hours')
      } else {
        console.log(`📈 Found ${recentDisbursements.length} disbursements processed in the last 24 hours`)
        
        // Group by status
        const statusCounts = recentDisbursements.reduce((acc, disbursement) => {
          acc[disbursement.status] = (acc[disbursement.status] || 0) + 1
          return acc
        }, {})
        
        console.log('\n📊 Disbursement status breakdown:')
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count} disbursements`)
        })
        
        // Show recent disbursements
        console.log('\n🕒 Most recent disbursements:')
        recentDisbursements.slice(0, 5).forEach((disbursement, index) => {
          const createdTime = new Date(disbursement.created_at).toLocaleString()
          console.log(`   ${index + 1}. ${disbursement.partners.name} - KSh ${disbursement.amount} (${disbursement.status}) - ${createdTime}`)
        })
      }
    }

    // 5. System health check
    console.log('\n\n🏥 System Health Check:')
    console.log('-'.repeat(50))
    
    // Check if loan tracking table exists and is accessible
    const { data: tableCheck, error: tableError } = await supabase
      .from('loan_tracking')
      .select('count')
      .limit(1)

    if (tableError) {
      console.log('❌ Loan tracking table not accessible:', tableError.message)
    } else {
      console.log('✅ Loan tracking table is accessible')
    }

    // Check if auto-disbursal configs table exists
    const { data: configTableCheck, error: configTableError } = await supabase
      .from('loan_product_auto_disbursal_configs')
      .select('count')
      .limit(1)

    if (configTableError) {
      console.log('❌ Auto-disbursal configs table not accessible:', configTableError.message)
    } else {
      console.log('✅ Auto-disbursal configs table is accessible')
    }

    // Check if disbursement requests table exists
    const { data: disbursementTableCheck, error: disbursementTableError } = await supabase
      .from('disbursement_requests')
      .select('count')
      .limit(1)

    if (disbursementTableError) {
      console.log('❌ Disbursement requests table not accessible:', disbursementTableError.message)
    } else {
      console.log('✅ Disbursement requests table is accessible')
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Monitoring completed successfully!')
    console.log('\n💡 Tips:')
    console.log('   • Run this script regularly to monitor system health')
    console.log('   • Check Supabase Edge Function logs for detailed execution logs')
    console.log('   • Monitor the loan tracking dashboard for real-time updates')
    console.log('   • Set up alerts for failed disbursements or polling errors')

  } catch (error) {
    console.error('❌ Monitoring failed with error:', error.message)
  }
}

// Run the monitoring
monitorLoanPolling()
