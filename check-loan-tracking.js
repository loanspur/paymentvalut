// Check loan tracking records directly
const { createClient } = require('@supabase/supabase-js')

// You'll need to replace these with your actual values
const supabaseUrl = 'YOUR_SUPABASE_URL' // Replace with your actual URL
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY' // Replace with your actual key

console.log('🔍 Checking loan tracking records...')
console.log('⚠️  Please update the script with your actual Supabase credentials')
console.log('   - supabaseUrl: Your Supabase project URL')
console.log('   - supabaseServiceKey: Your Supabase service role key')
console.log('')
console.log('You can find these in:')
console.log('   - Supabase Dashboard → Settings → API')
console.log('   - Or in your .env.local file')
console.log('')
console.log('Then run: node check-loan-tracking.js')

// Uncomment and update these lines with your actual credentials:
/*
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkLoanTracking() {
  try {
    console.log('📊 Checking loan tracking records...')
    
    const { data: records, error } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners!inner(name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log(`\n📋 Found ${records.length} loan tracking record(s):`)
    
    if (records.length === 0) {
      console.log('   No loan tracking records found.')
      console.log('   This means either:')
      console.log('   1. No webhook was received')
      console.log('   2. Webhook was received but failed to process')
      console.log('   3. Partner configuration issue')
    } else {
      records.forEach((record, index) => {
        console.log(`\n${index + 1}. Loan ID: ${record.loan_id}`)
        console.log(`   Partner: ${record.partners?.name || 'Unknown'}`)
        console.log(`   Client ID: ${record.client_id}`)
        console.log(`   Amount: KSh ${record.loan_amount}`)
        console.log(`   Status: ${record.status}`)
        console.log(`   Disbursement Status: ${record.disbursement_status || 'N/A'}`)
        console.log(`   Created: ${new Date(record.created_at).toLocaleString()}`)
        if (record.error_message) {
          console.log(`   Error: ${record.error_message}`)
        }
      })
    }

    // Also check disbursement requests
    console.log('\n📊 Checking disbursement requests...')
    const { data: disbursements, error: disbError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (disbError) {
      console.error('❌ Error checking disbursements:', disbError)
    } else {
      console.log(`\n📋 Found ${disbursements.length} recent disbursement request(s):`)
      disbursements.forEach((disb, index) => {
        console.log(`\n${index + 1}. ID: ${disb.id}`)
        console.log(`   Amount: KSh ${disb.amount}`)
        console.log(`   Phone: ${disb.msisdn}`)
        console.log(`   Status: ${disb.status}`)
        console.log(`   Origin: ${disb.origin}`)
        console.log(`   Created: ${new Date(disb.created_at).toLocaleString()}`)
        if (disb.external_reference) {
          console.log(`   External Ref: ${disb.external_reference}`)
        }
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkLoanTracking()
*/
