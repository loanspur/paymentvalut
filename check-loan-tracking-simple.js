// Simple script to check loan tracking records
// Run this with: node check-loan-tracking-simple.js

const { createClient } = require('@supabase/supabase-js')

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co' // Replace with your URL
const supabaseKey = 'your-service-role-key' // Replace with your service role key

console.log('🔍 Checking loan tracking records...')
console.log('📝 Note: Please update the Supabase credentials in this script first')
console.log('   - supabaseUrl: Your Supabase project URL')
console.log('   - supabaseKey: Your Supabase service role key')
console.log('')

if (supabaseUrl.includes('your-project') || supabaseKey.includes('your-service-role')) {
  console.log('❌ Please update the Supabase credentials in this script first')
  console.log('   You can find these in your Supabase project settings')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLoanTracking() {
  try {
    // Check loan tracking table
    const { data: loanTracking, error: trackingError } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners(name)
      `)
      .order('created_at', { ascending: false })

    if (trackingError) {
      console.error('❌ Error fetching loan tracking:', trackingError.message)
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
        if (record.error_message) {
          console.log(`   Error: ${record.error_message}`)
        }
      })
    } else {
      console.log('No loan tracking records found.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkLoanTracking()
