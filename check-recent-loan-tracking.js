const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseKey.includes('your-service-role')) {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRecentLoanTracking() {
  console.log('🔍 Checking recent loan tracking records...\n')

  try {
    // Check recent loan tracking records
    const { data: loanTracking, error: trackingError } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (trackingError) {
      console.error('❌ Error fetching loan tracking:', trackingError)
      return
    }

    console.log(`📊 Found ${loanTracking?.length || 0} loan tracking records:`)
    console.log('=' .repeat(80))
    
    if (loanTracking && loanTracking.length > 0) {
      loanTracking.forEach((record, index) => {
        console.log(`\n${index + 1}. Loan ID: ${record.loan_id}`)
        console.log(`   Client ID: ${record.client_id}`)
        console.log(`   Client Name: ${record.client_name}`)
        console.log(`   Phone: ${record.phone_number}`)
        console.log(`   Amount: ${record.loan_amount}`)
        console.log(`   Status: ${record.status}`)
        console.log(`   Partner: ${record.partners?.name || 'Unknown'}`)
        console.log(`   Created: ${record.created_at}`)
        console.log(`   Updated: ${record.updated_at}`)
        if (record.error_message) {
          console.log(`   Error: ${record.error_message}`)
        }
      })
    } else {
      console.log('No loan tracking records found.')
    }

    // Check recent disbursement requests
    console.log('\n' + '=' .repeat(80))
    console.log('🔍 Checking recent disbursement requests...\n')

    const { data: disbursements, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (disbursementError) {
      console.error('❌ Error fetching disbursements:', disbursementError)
    } else {
      console.log(`📊 Found ${disbursements?.length || 0} disbursement requests:`)
      
      if (disbursements && disbursements.length > 0) {
        disbursements.forEach((disbursement, index) => {
          console.log(`\n${index + 1}. ID: ${disbursement.id}`)
          console.log(`   Phone: ${disbursement.phone_number}`)
          console.log(`   Amount: ${disbursement.amount}`)
          console.log(`   Status: ${disbursement.status}`)
          console.log(`   Origin: ${disbursement.origin}`)
          console.log(`   Created: ${disbursement.created_at}`)
          if (disbursement.error_message) {
            console.log(`   Error: ${disbursement.error_message}`)
          }
        })
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkRecentLoanTracking()
