// Script to check webhook activity and recent logs
const { createClient } = require('@supabase/supabase-js')

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co' // Replace with your URL
const supabaseKey = 'your-service-role-key' // Replace with your service role key

console.log('🔍 Checking webhook activity and recent logs...')
console.log('📝 Note: Please update the Supabase credentials in this script first')
console.log('')

if (supabaseUrl.includes('your-project') || supabaseKey.includes('your-service-role')) {
  console.log('❌ Please update the Supabase credentials in this script first')
  console.log('   You can find these in your Supabase project settings')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWebhookActivity() {
  try {
    console.log('📊 Checking recent disbursement requests (last 24 hours)...')
    
    // Check disbursement requests from the last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: disbursements, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })

    if (disbursementError) {
      console.error('❌ Error fetching disbursements:', disbursementError.message)
    } else {
      console.log(`📊 Found ${disbursements?.length || 0} disbursement requests in last 24 hours:`)
      
      if (disbursements && disbursements.length > 0) {
        disbursements.forEach((disbursement, index) => {
          console.log(`\n${index + 1}. ID: ${disbursement.id}`)
          console.log(`   Phone: ${disbursement.phone_number}`)
          console.log(`   Amount: ${disbursement.amount}`)
          console.log(`   Status: ${disbursement.status}`)
          console.log(`   Origin: ${disbursement.origin}`)
          console.log(`   Created: ${disbursement.created_at}`)
          
          // Check if it has Mifos metadata
          if (disbursement.metadata) {
            const metadata = typeof disbursement.metadata === 'string' 
              ? JSON.parse(disbursement.metadata) 
              : disbursement.metadata
            console.log(`   Mifos Loan ID: ${metadata.mifos_loan_id}`)
            console.log(`   Mifos Client ID: ${metadata.mifos_client_id}`)
            console.log(`   Client Name: ${metadata.client_name}`)
          }
          
          if (disbursement.error_message) {
            console.log(`   Error: ${disbursement.error_message}`)
          }
        })
      } else {
        console.log('No disbursement requests found in the last 24 hours.')
      }
    }

    console.log('\n' + '=' .repeat(80))
    console.log('📊 Checking loan tracking records...')
    
    // Check loan tracking records
    const { data: loanTracking, error: trackingError } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners(name)
      `)
      .order('created_at', { ascending: false })

    if (trackingError) {
      console.error('❌ Error fetching loan tracking:', trackingError.message)
    } else {
      console.log(`📊 Found ${loanTracking?.length || 0} loan tracking records:`)
      
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
          if (record.error_message) {
            console.log(`   Error: ${record.error_message}`)
          }
        })
      } else {
        console.log('No loan tracking records found.')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkWebhookActivity()
