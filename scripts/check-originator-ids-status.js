/**
 * Script to check transaction status for originator_conversation_ids
 * Usage: node scripts/check-originator-ids-status.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const originatorIds = [
  '6ef4-493b-b339-804aadd21902167841',
  'b147-4d80-adec-9354d618be76231837',
  'b147-4d80-adec-9354d618be76371265',
  'b147-4d80-adec-9354d618be76500638',
  'b285-442b-905c-bf3f5843a498621944',
  'cd32-4f5a-9ec7-6c7b1af0e88e288495',
  'af40-447e-b2e9-a4a89f523a681935584',
  'af40-447e-b2e9-a4a89f523a681936825',
  '4474-4b75-95c4-1ee826332d00151904',
  '012e-4077-9e75-d1e27265b990551792',
  'd791-4933-9452-49faa42621c7595086',
  'bd4e-4dad-9659-44d0e63470bc57934'
]

async function checkOriginatorIds() {
  console.log(`\n🔍 Checking status for ${originatorIds.length} originator_conversation_ids...\n`)

  // Get disbursement requests
  const { data: disbursements, error: disbursementError } = await supabase
    .from('disbursement_requests')
    .select(`
      id,
      conversation_id,
      originator_conversation_id,
      client_request_id,
      customer_name,
      customer_id,
      msisdn,
      amount,
      status,
      result_code,
      result_desc,
      transaction_id,
      transaction_receipt,
      partner_id,
      created_at,
      updated_at,
      partners:partner_id (
        id,
        name,
        short_code
      )
    `)
    .in('originator_conversation_id', originatorIds)

  if (disbursementError) {
    console.error('❌ Error fetching disbursements:', disbursementError)
    return
  }

  // Get conversation IDs from disbursements
  const conversationIds = disbursements
    .map(d => d.conversation_id)
    .filter(Boolean)

  // Get callbacks by originator_conversation_id
  const { data: callbacksByOriginator, error: callbackError1 } = await supabase
    .from('mpesa_callbacks')
    .select('*')
    .in('originator_conversation_id', originatorIds)
    .order('created_at', { ascending: false })

  // Get callbacks by conversation_id
  let callbacksByConversation = []
  if (conversationIds.length > 0) {
    const { data, error: callbackError2 } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })

    if (!callbackError2) {
      callbacksByConversation = data || []
    }
  }

  // Combine callbacks and get latest for each originator_conversation_id
  const callbackMap = new Map()

  // Process callbacks by originator_conversation_id
  if (callbacksByOriginator) {
    callbacksByOriginator.forEach(callback => {
      const key = callback.originator_conversation_id
      if (key && (!callbackMap.has(key) || new Date(callback.created_at) > new Date(callbackMap.get(key).created_at))) {
        callbackMap.set(key, callback)
      }
    })
  }

  // Process callbacks by conversation_id (match to originator_conversation_id via disbursement)
  if (callbacksByConversation) {
    callbacksByConversation.forEach(callback => {
      const disbursement = disbursements.find(d => d.conversation_id === callback.conversation_id)
      if (disbursement && disbursement.originator_conversation_id) {
        const key = disbursement.originator_conversation_id
        if (!callbackMap.has(key) || new Date(callback.created_at) > new Date(callbackMap.get(key).created_at)) {
          callbackMap.set(key, callback)
        }
      }
    })
  }

  // Build results
  const results = originatorIds.map(originatorId => {
    const disbursement = disbursements.find(d => d.originator_conversation_id === originatorId)
    const callback = callbackMap.get(originatorId)

    let finalStatus = 'NOT FOUND'
    let statusDetails = {}

    if (disbursement) {
      if (callback) {
        if (callback.result_code === '0') {
          finalStatus = '✅ SUCCESS'
          statusDetails = {
            receipt: callback.receipt_number || callback.transaction_id,
            resultCode: callback.result_code,
            resultDesc: callback.result_desc,
            callbackReceived: callback.created_at
          }
        } else if (['1', '1032'].includes(callback.result_code)) {
          finalStatus = '❌ FAILED'
          statusDetails = {
            resultCode: callback.result_code,
            resultDesc: callback.result_desc,
            callbackReceived: callback.created_at
          }
        } else {
          finalStatus = '⏳ PENDING'
          statusDetails = {
            resultCode: callback.result_code,
            resultDesc: callback.result_desc,
            callbackReceived: callback.created_at
          }
        }
      } else {
        if (disbursement.status === 'success') {
          finalStatus = '✅ SUCCESS (No Callback)'
          statusDetails = {
            receipt: disbursement.transaction_receipt || disbursement.transaction_id,
            resultCode: disbursement.result_code,
            resultDesc: disbursement.result_desc
          }
        } else if (disbursement.status === 'failed') {
          finalStatus = '❌ FAILED (No Callback)'
          statusDetails = {
            resultCode: disbursement.result_code,
            resultDesc: disbursement.result_desc
          }
        } else {
          finalStatus = '⏳ PENDING - No Callback'
          statusDetails = {
            disbursementStatus: disbursement.status,
            created: disbursement.created_at
          }
        }
      }
    }

    return {
      originator_conversation_id: originatorId,
      status: finalStatus,
      disbursement: disbursement ? {
        id: disbursement.id,
        conversation_id: disbursement.conversation_id,
        customer_name: disbursement.customer_name,
        msisdn: disbursement.msisdn,
        amount: disbursement.amount,
        status: disbursement.status,
        created_at: disbursement.created_at,
        partner: disbursement.partners?.name
      } : null,
      callback: callback ? {
        id: callback.id,
        result_code: callback.result_code,
        result_desc: callback.result_desc,
        receipt_number: callback.receipt_number,
        transaction_id: callback.transaction_id,
        created_at: callback.created_at
      } : null,
      details: statusDetails
    }
  })

  // Display results
  console.log('='.repeat(100))
  console.log('TRANSACTION STATUS RESULTS')
  console.log('='.repeat(100))
  console.log()

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.originator_conversation_id}`)
    console.log(`   Status: ${result.status}`)
    
    if (result.disbursement) {
      console.log(`   Customer: ${result.disbursement.customer_name || result.disbursement.msisdn}`)
      console.log(`   Amount: KES ${result.disbursement.amount?.toLocaleString() || '0'}`)
      console.log(`   Partner: ${result.disbursement.partner || 'N/A'}`)
      console.log(`   Disbursement Status: ${result.disbursement.status}`)
      console.log(`   Created: ${new Date(result.disbursement.created_at).toLocaleString()}`)
    } else {
      console.log(`   ⚠️  No disbursement record found`)
    }

    if (result.callback) {
      console.log(`   Callback Result Code: ${result.callback.result_code}`)
      console.log(`   Callback Result: ${result.callback.result_desc}`)
      if (result.callback.receipt_number) {
        console.log(`   Receipt Number: ${result.callback.receipt_number}`)
      }
      console.log(`   Callback Received: ${new Date(result.callback.created_at).toLocaleString()}`)
    } else if (result.disbursement) {
      console.log(`   ⚠️  No callback received yet`)
    }

    console.log()
  })

  // Summary
  const summary = {
    total: results.length,
    found: results.filter(r => r.disbursement).length,
    hasCallbacks: results.filter(r => r.callback).length,
    successful: results.filter(r => r.status.includes('SUCCESS')).length,
    failed: results.filter(r => r.status.includes('FAILED')).length,
    pending: results.filter(r => r.status.includes('PENDING')).length,
    notFound: results.filter(r => r.status === 'NOT FOUND').length
  }

  console.log('='.repeat(100))
  console.log('SUMMARY')
  console.log('='.repeat(100))
  console.log(`Total Originator IDs: ${summary.total}`)
  console.log(`Found in Disbursements: ${summary.found}`)
  console.log(`Has Callbacks: ${summary.hasCallbacks}`)
  console.log(`✅ Successful: ${summary.successful}`)
  console.log(`❌ Failed: ${summary.failed}`)
  console.log(`⏳ Pending: ${summary.pending}`)
  console.log(`⚠️  Not Found: ${summary.notFound}`)
  console.log('='.repeat(100))
  console.log()

  return results
}

// Run the check
checkOriginatorIds()
  .then(() => {
    console.log('✅ Check completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

