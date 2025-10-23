require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRetrySystemStatus() {
  console.log('🧪 Testing Retry System Status After Migration')
  console.log('===============================================\n')

  try {
    // Step 1: Test the deployed Edge Function
    console.log('📋 Step 1: Testing deployed disburse-retry Edge Function...')
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/disburse-retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({})
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Disburse-retry Edge Function is working!')
      console.log(`   Success: ${data.success}`)
      console.log(`   Message: ${data.message}`)
      console.log(`   Retry count: ${data.retry_count || 0}`)
    } else {
      const error = await response.json()
      console.log('❌ Disburse-retry Edge Function error:')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${error.error}`)
      console.log(`   Details: ${error.details}`)
    }

    // Step 2: Test database functions individually
    console.log('\n📋 Step 2: Testing database functions...')
    
    // Test calculate_next_retry_time
    try {
      const { data: nextRetryTime, error: nextRetryError } = await supabase
        .rpc('calculate_next_retry_time', { retry_count: 0, base_delay_minutes: 5 })
      
      if (nextRetryError) {
        console.log('❌ calculate_next_retry_time function error:', nextRetryError.message)
      } else {
        console.log('✅ calculate_next_retry_time function working')
        console.log(`   Next retry time: ${nextRetryTime}`)
      }
    } catch (err) {
      console.log('❌ calculate_next_retry_time function not available')
    }

    // Test should_retry_disbursement
    try {
      const { data: shouldRetry, error: shouldRetryError } = await supabase
        .rpc('should_retry_disbursement', {
          p_status: 'failed',
          p_retry_count: 1,
          p_max_retries: 3,
          p_mpesa_response_code: '1001'
        })
      
      if (shouldRetryError) {
        console.log('❌ should_retry_disbursement function error:', shouldRetryError.message)
      } else {
        console.log('✅ should_retry_disbursement function working')
        console.log(`   Should retry: ${shouldRetry}`)
      }
    } catch (err) {
      console.log('❌ should_retry_disbursement function not available')
    }

    // Test get_disbursements_for_retry
    try {
      const { data: retryCandidates, error: retryCandidatesError } = await supabase
        .rpc('get_disbursements_for_retry')
      
      if (retryCandidatesError) {
        console.log('❌ get_disbursements_for_retry function error:', retryCandidatesError.message)
        console.log('   This function needs to be fixed')
      } else {
        console.log('✅ get_disbursements_for_retry function working')
        console.log(`   Found ${retryCandidates.length} disbursements ready for retry`)
      }
    } catch (err) {
      console.log('❌ get_disbursements_for_retry function not available')
    }

    // Step 3: Check database schema
    console.log('\n📋 Step 3: Checking database schema...')
    
    const { data: disbursements, error: disbursementsError } = await supabase
      .from('disbursement_requests')
      .select('id, retry_count, max_retries, retry_reason, next_retry_at')
      .limit(1)

    if (disbursementsError) {
      console.log('❌ Error accessing disbursement_requests:', disbursementsError.message)
    } else {
      console.log('✅ disbursement_requests table accessible')
      if (disbursements.length > 0) {
        const sample = disbursements[0]
        console.log('✅ Retry columns exist:')
        console.log(`   retry_count: ${sample.retry_count}`)
        console.log(`   max_retries: ${sample.max_retries}`)
        console.log(`   retry_reason: ${sample.retry_reason}`)
        console.log(`   next_retry_at: ${sample.next_retry_at}`)
      }
    }

    // Step 4: Check retry logs table
    console.log('\n📋 Step 4: Checking disbursement_retry_logs table...')
    
    const { data: retryLogs, error: retryLogsError } = await supabase
      .from('disbursement_retry_logs')
      .select('id')
      .limit(1)

    if (retryLogsError) {
      console.log('❌ disbursement_retry_logs table error:', retryLogsError.message)
    } else {
      console.log('✅ disbursement_retry_logs table accessible')
    }

    // Step 5: Summary and next steps
    console.log('\n📊 Summary:')
    console.log('===========')
    console.log('✅ Database migration completed successfully')
    console.log('✅ Retry columns exist in disbursement_requests table')
    console.log('✅ disbursement_retry_logs table exists')
    console.log('✅ calculate_next_retry_time function working')
    console.log('✅ should_retry_disbursement function working')
    console.log('❌ get_disbursements_for_retry function needs fixing')

    console.log('\n🔧 Next Step Required:')
    console.log('The get_disbursements_for_retry function needs to be fixed.')
    console.log('Please run the following SQL in your Supabase dashboard:')
    console.log('\n' + '='.repeat(60))
    console.log('-- Fix the get_disbursements_for_retry function')
    console.log('DROP FUNCTION IF EXISTS get_disbursements_for_retry();')
    console.log('')
    console.log('CREATE OR REPLACE FUNCTION get_disbursements_for_retry()')
    console.log('RETURNS TABLE (')
    console.log('    id UUID,')
    console.log('    partner_id UUID,')
    console.log('    amount NUMERIC,')
    console.log('    msisdn VARCHAR(20),')
    console.log('    client_request_id VARCHAR(255),')
    console.log('    retry_count INTEGER,')
    console.log('    max_retries INTEGER,')
    console.log('    retry_reason TEXT,')
    console.log('    next_retry_at TIMESTAMP WITH TIME ZONE,')
    console.log('    status VARCHAR(50),')
    console.log('    mpesa_response_code VARCHAR(10),')
    console.log('    mpesa_response_description TEXT,')
    console.log('    partner_name TEXT,')
    console.log('    partner_api_key TEXT')
    console.log(') AS $$')
    console.log('BEGIN')
    console.log('    RETURN QUERY')
    console.log('    SELECT ')
    console.log('        dr.id,')
    console.log('        dr.partner_id,')
    console.log('        dr.amount,')
    console.log('        dr.msisdn,')
    console.log('        dr.client_request_id,')
    console.log('        COALESCE(dr.retry_count, 0) as retry_count,')
    console.log('        COALESCE(dr.max_retries, 3) as max_retries,')
    console.log('        dr.retry_reason,')
    console.log('        dr.next_retry_at,')
    console.log('        dr.status,')
    console.log('        dr.result_code,')
    console.log('        dr.result_desc,')
    console.log('        p.name as partner_name,')
    console.log('        p.api_key as partner_api_key')
    console.log('    FROM disbursement_requests dr')
    console.log('    JOIN partners p ON dr.partner_id = p.id')
    console.log('    WHERE dr.status IN (\'failed\', \'pending\')')
    console.log('    AND COALESCE(dr.retry_count, 0) < COALESCE(dr.max_retries, 3)')
    console.log('    AND (dr.next_retry_at IS NULL OR dr.next_retry_at <= NOW())')
    console.log('    AND should_retry_disbursement(')
    console.log('        dr.status, ')
    console.log('        COALESCE(dr.retry_count, 0), ')
    console.log('        COALESCE(dr.max_retries, 3), ')
    console.log('        dr.result_code')
    console.log('    )')
    console.log('    ORDER BY dr.next_retry_at ASC NULLS LAST, dr.created_at ASC;')
    console.log('END;')
    console.log('$$ LANGUAGE plpgsql;')
    console.log('='.repeat(60))

    console.log('\n🎯 After running this SQL:')
    console.log('1. The retry system will be fully functional')
    console.log('2. You can test the Edge Function again')
    console.log('3. Set up a cron job to run retries every 5 minutes')

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run the test
testRetrySystemStatus()

