// Monitor webhook activity and loan tracking
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function monitorWebhookActivity() {
  console.log('🔍 Monitoring webhook activity...')
  console.log('📡 Waiting for loan approval webhooks...')
  console.log('💡 Approve a loan in Mifos X to trigger the webhook')
  console.log('⏹️  Press Ctrl+C to stop monitoring\n')

  let lastCount = 0
  
  const checkActivity = async () => {
    try {
      // Check loan tracking records
      const { data: loanTracking, error: trackingError } = await supabase
        .from('loan_tracking')
        .select('*')
        .order('created_at', { ascending: false })

      if (trackingError) {
        console.error('❌ Error checking loan tracking:', trackingError)
        return
      }

      const currentCount = loanTracking?.length || 0
      
      if (currentCount > lastCount) {
        console.log(`\n🎉 NEW LOAN APPROVAL DETECTED!`)
        console.log(`📊 Total loan tracking records: ${currentCount}`)
        
        const newRecord = loanTracking[0]
        console.log(`\n📋 Latest Record:`)
        console.log(`   Loan ID: ${newRecord.loan_id}`)
        console.log(`   Client ID: ${newRecord.client_id}`)
        console.log(`   Amount: KSh ${newRecord.loan_amount}`)
        console.log(`   Status: ${newRecord.status}`)
        console.log(`   Created: ${new Date(newRecord.created_at).toLocaleString()}`)
        
        if (newRecord.disbursement_status) {
          console.log(`   Disbursement Status: ${newRecord.disbursement_status}`)
        }
        
        if (newRecord.mpesa_receipt_number) {
          console.log(`   M-Pesa Receipt: ${newRecord.mpesa_receipt_number}`)
        }
        
        if (newRecord.error_message) {
          console.log(`   Error: ${newRecord.error_message}`)
        }
        
        console.log(`\n🔍 Check the Loan Tracking dashboard at: http://localhost:3000/loan-tracking`)
        console.log(`📡 Continue monitoring...\n`)
      }
      
      lastCount = currentCount
      
    } catch (error) {
      console.error('❌ Error monitoring:', error.message)
    }
  }

  // Check every 2 seconds
  const interval = setInterval(checkActivity, 2000)
  
  // Initial check
  await checkActivity()
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping webhook monitoring...')
    clearInterval(interval)
    process.exit(0)
  })
}

monitorWebhookActivity()
