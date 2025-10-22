// Monitor webhook activity in real-time
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

console.log('🔍 Monitoring webhook activity...')
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

async function monitorWebhookActivity() {
  console.log('🔄 Starting webhook activity monitoring...')
  console.log('⏰ Monitoring every 30 seconds...')
  console.log('🛑 Press Ctrl+C to stop monitoring')
  console.log('=' .repeat(80))

  let lastCheckTime = new Date()
  let lastDisbursementCount = 0
  let lastLoanTrackingCount = 0

  // Get initial counts
  try {
    const [disbursementsResult, loanTrackingResult] = await Promise.all([
      supabase
        .from('disbursement_requests')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()), // Last 24 hours
      
      supabase
        .from('loan_tracking')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    ])

    lastDisbursementCount = disbursementsResult.count || 0
    lastLoanTrackingCount = loanTrackingResult.count || 0

    console.log(`📊 Initial counts (last 24 hours):`)
    console.log(`   Disbursements: ${lastDisbursementCount}`)
    console.log(`   Loan Tracking: ${lastLoanTrackingCount}`)
    console.log('')

  } catch (error) {
    console.error('❌ Error getting initial counts:', error.message)
  }

  // Monitor every 30 seconds
  const interval = setInterval(async () => {
    try {
      const currentTime = new Date()
      console.log(`⏰ ${currentTime.toLocaleTimeString()} - Checking for new activity...`)

      // Check for new disbursements
      const { data: disbursements, error: disbursementError } = await supabase
        .from('disbursement_requests')
        .select('*')
        .gte('created_at', lastCheckTime.toISOString())
        .order('created_at', { ascending: false })

      if (disbursementError) {
        console.error('❌ Error fetching disbursements:', disbursementError.message)
      } else if (disbursements && disbursements.length > 0) {
        console.log(`🆕 Found ${disbursements.length} new disbursement(s):`)
        disbursements.forEach((disbursement, index) => {
          console.log(`   ${index + 1}. ID: ${disbursement.id}`)
          console.log(`      Phone: ${disbursement.phone_number}`)
          console.log(`      Amount: ${disbursement.amount}`)
          console.log(`      Status: ${disbursement.status}`)
          console.log(`      Origin: ${disbursement.origin}`)
          console.log(`      Created: ${disbursement.created_at}`)
          
          // Check if it has Mifos metadata
          if (disbursement.metadata) {
            const metadata = typeof disbursement.metadata === 'string' 
              ? JSON.parse(disbursement.metadata) 
              : disbursement.metadata
            if (metadata.mifos_loan_id) {
              console.log(`      🎯 Mifos Loan ID: ${metadata.mifos_loan_id}`)
              console.log(`      🎯 Client Name: ${metadata.client_name}`)
            }
          }
          console.log('')
        })
      }

      // Check for new loan tracking records
      const { data: loanTracking, error: trackingError } = await supabase
        .from('loan_tracking')
        .select(`
          *,
          partners(name)
        `)
        .gte('created_at', lastCheckTime.toISOString())
        .order('created_at', { ascending: false })

      if (trackingError) {
        console.error('❌ Error fetching loan tracking:', trackingError.message)
      } else if (loanTracking && loanTracking.length > 0) {
        console.log(`🆕 Found ${loanTracking.length} new loan tracking record(s):`)
        loanTracking.forEach((record, index) => {
          console.log(`   ${index + 1}. Loan ID: ${record.loan_id}`)
          console.log(`      Client: ${record.client_name}`)
          console.log(`      Amount: ${record.loan_amount}`)
          console.log(`      Status: ${record.status}`)
          console.log(`      Partner: ${record.partners?.name || 'Unknown'}`)
          console.log(`      Created: ${record.created_at}`)
          console.log('')
        })
      }

      // Update last check time
      lastCheckTime = currentTime

      // If no new activity, show a simple status
      if ((!disbursements || disbursements.length === 0) && (!loanTracking || loanTracking.length === 0)) {
        console.log('   ℹ️  No new activity detected')
      }

      console.log('─' .repeat(80))

    } catch (error) {
      console.error('❌ Error during monitoring:', error.message)
    }
  }, 30000) // Check every 30 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping webhook monitoring...')
    clearInterval(interval)
    process.exit(0)
  })
}

monitorWebhookActivity()