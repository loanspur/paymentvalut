require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testFunctionFix() {
  console.log('🧪 Testing get_disbursements_for_retry Function Fix')
  console.log('==================================================\n')

  try {
    // Test the specific function that was causing issues
    console.log('📋 Testing get_disbursements_for_retry function...')
    
    const { data: retryCandidates, error: retryCandidatesError } = await supabase
      .rpc('get_disbursements_for_retry')

    if (retryCandidatesError) {
      console.log('❌ Function still has issues:', retryCandidatesError.message)
      console.log('\n🔧 You need to run the SQL fix in your Supabase dashboard:')
      console.log('============================================================')
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
      console.log('============================================================')
    } else {
      console.log('✅ Function is working correctly!')
      console.log(`   Found ${retryCandidates.length} disbursements ready for retry`)
      
      if (retryCandidates.length > 0) {
        console.log('\n📊 Sample disbursement ready for retry:')
        const sample = retryCandidates[0]
        console.log(`   ID: ${sample.id}`)
        console.log(`   Partner: ${sample.partner_name}`)
        console.log(`   Amount: KSh ${sample.amount}`)
        console.log(`   Status: ${sample.status}`)
        console.log(`   Retry Count: ${sample.retry_count}/${sample.max_retries}`)
      }
    }

    // Test the Edge Function
    console.log('\n📋 Testing disburse-retry Edge Function...')
    
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
      console.log('✅ Edge Function is working!')
      console.log(`   Success: ${data.success}`)
      console.log(`   Message: ${data.message}`)
      console.log(`   Retry count: ${data.retry_count || 0}`)
      console.log(`   Success count: ${data.success_count || 0}`)
      console.log(`   Failure count: ${data.failure_count || 0}`)
    } else {
      const error = await response.json()
      console.log('❌ Edge Function error:', error.error)
      console.log('   Details:', error.details)
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run the test
testFunctionFix()


