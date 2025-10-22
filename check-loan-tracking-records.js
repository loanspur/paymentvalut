// Check loan tracking records in the database
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
console.log('Then run: node check-loan-tracking-records.js')

// Uncomment and update these lines with your actual credentials:
/*
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkLoanTrackingRecords() {
  try {
    console.log('📊 Checking loan tracking records...')
    
    // Check loan tracking records
    const { data: loanRecords, error: loanError } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners!inner(name)
      `)
      .order('created_at', { ascending: false })

    if (loanError) {
      console.error('❌ Error checking loan tracking:', loanError)
      return
    }

    console.log(`\n📋 Found ${loanRecords.length} loan tracking record(s):`)
    
    if (loanRecords.length === 0) {
      console.log('   No loan tracking records found.')
      console.log('   This means either:')
      console.log('   1. No webhooks were received')
      console.log('   2. Webhooks were received but failed to process')
      console.log('   3. Partner configuration issue')
    } else {
      loanRecords.forEach((record, index) => {
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
        if (record.mpesa_receipt_number) {
          console.log(`   M-Pesa Receipt: ${record.mpesa_receipt_number}`)
        }
      })
    }

    // Check disbursement requests
    console.log('\n📊 Checking disbursement requests...')
    const { data: disbursements, error: disbError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

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
        if (disb.metadata) {
          console.log(`   Metadata: ${JSON.stringify(disb.metadata, null, 2)}`)
        }
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkLoanTrackingRecords()
*/
