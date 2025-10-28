import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 [Retry] Starting disbursement retry process...')
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get disbursements ready for retry
    console.log('📋 [Retry] Fetching disbursements ready for retry...')
    
    const { data: disbursementsToRetry, error: fetchError } = await supabaseClient
      .rpc('get_disbursements_for_retry')

    if (fetchError) {
      console.error('❌ [Retry] Error fetching disbursements for retry:', fetchError.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch disbursements for retry',
          details: fetchError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!disbursementsToRetry || disbursementsToRetry.length === 0) {
      console.log('✅ [Retry] No disbursements ready for retry')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No disbursements ready for retry',
          retry_count: 0,
          processed: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔄 [Retry] Found ${disbursementsToRetry.length} disbursements ready for retry`)

    const retryResults = []
    let successCount = 0
    let failureCount = 0

    // Process each disbursement for retry
    for (const disbursement of disbursementsToRetry) {
      console.log(`\n🔄 [Retry] Processing disbursement ${disbursement.id} (attempt ${disbursement.retry_count + 1})`)
      
      try {
        const retryResult = await retryDisbursement(supabaseClient, disbursement)
        retryResults.push(retryResult)
        
        if (retryResult.success) {
          successCount++
        } else {
          failureCount++
        }
      } catch (error) {
        console.error(`❌ [Retry] Error processing disbursement ${disbursement.id}:`, error.message)
        retryResults.push({
          disbursement_id: disbursement.id,
          success: false,
          error: error.message,
          retry_attempt: disbursement.retry_count + 1
        })
        failureCount++
      }
    }

    console.log(`\n📊 [Retry] Retry process completed:`)
    console.log(`   Total processed: ${retryResults.length}`)
    console.log(`   Successful: ${successCount}`)
    console.log(`   Failed: ${failureCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Retry process completed`,
        retry_count: retryResults.length,
        success_count: successCount,
        failure_count: failureCount,
        processed: retryResults
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [Retry] Critical error in retry process:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Critical error in retry process',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function retryDisbursement(supabaseClient: any, disbursement: any) {
  const disbursementId = disbursement.id
  const retryAttempt = disbursement.retry_count + 1
  
  console.log(`   💰 Amount: KSh ${disbursement.amount}`)
  console.log(`   📱 Phone: ${disbursement.msisdn}`)
  console.log(`   🏢 Partner: ${disbursement.partner_name}`)
  console.log(`   🔄 Attempt: ${retryAttempt}/${disbursement.max_retries}`)

  try {
    // Update disbursement record to mark retry attempt
    const { error: updateError } = await supabaseClient
      .from('disbursement_requests')
      .update({
        retry_count: retryAttempt,
        retry_reason: `Retry attempt ${retryAttempt}`,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', disbursementId)

    if (updateError) {
      throw new Error(`Failed to update disbursement record: ${updateError.message}`)
    }

    // Log retry attempt
    const { error: logError } = await supabaseClient
      .from('disbursement_retry_logs')
      .insert({
        disbursement_id: disbursementId,
        retry_attempt: retryAttempt,
        retry_reason: `Retry attempt ${retryAttempt}`,
        retry_timestamp: new Date().toISOString()
      })

    if (logError) {
      console.error(`   ⚠️ [Retry] Failed to log retry attempt: ${logError.message}`)
    }

    // Prepare disbursement data for retry
    const disbursementData = {
      partner_id: disbursement.partner_id,
      tenant_id: 'default',
      msisdn: disbursement.msisdn,
      amount: disbursement.amount,
      customer_id: disbursement.client_request_id,
      client_request_id: `${disbursement.client_request_id}_retry_${retryAttempt}`,
      external_reference: disbursement.id,
      origin: 'retry',
      description: `Retry attempt ${retryAttempt} for disbursement ${disbursementId}`,
      currency: 'KES'
    }

    console.log(`   📤 [Retry] Sending disbursement request...`)

    // Call the main disbursement function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'x-api-key': disbursement.partner_api_key
      },
      body: JSON.stringify(disbursementData)
    })

    const result = await response.json()
    
    if (response.ok && result.status === 'accepted') {
      console.log(`   ✅ [Retry] Disbursement retry successful!`)
      console.log(`   📋 Conversation ID: ${result.conversation_id}`)
      console.log(`   💰 Disbursement ID: ${result.disbursement_id}`)

      // Update disbursement record with success
      const { error: successUpdateError } = await supabaseClient
        .from('disbursement_requests')
        .update({
          status: 'success',
          conversation_id: result.conversation_id,
          originator_conversation_id: result.originator_conversation_id,
          transaction_id: result.conversation_id,
          transaction_receipt: result.details?.transaction_receipt || result.conversation_id,
          receipt_number: result.details?.transaction_receipt || result.conversation_id,
          transaction_amount: disbursement.amount,
          transaction_date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
          result_code: '0',
          result_desc: 'Success',
          next_retry_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', disbursementId)

      if (successUpdateError) {
        console.error(`   ⚠️ [Retry] Failed to update success status: ${successUpdateError.message}`)
      }

      // Update retry log with success
      const { error: successLogError } = await supabaseClient
        .from('disbursement_retry_logs')
        .update({
          mpesa_response_code: '0',
          mpesa_response_description: 'Success',
          error_details: { success: true, result: result }
        })
        .eq('disbursement_id', disbursementId)
        .eq('retry_attempt', retryAttempt)

      if (successLogError) {
        console.error(`   ⚠️ [Retry] Failed to update retry log: ${successLogError.message}`)
      }

      return {
        disbursement_id: disbursementId,
        success: true,
        retry_attempt: retryAttempt,
        conversation_id: result.conversation_id,
        disbursement_id_new: result.disbursement_id,
        message: 'Disbursement retry successful'
      }

    } else {
      console.log(`   ❌ [Retry] Disbursement retry failed:`)
      console.log(`   📋 Error: ${result.error || result.error_message || 'Unknown error'}`)
      
      const errorCode = result.details?.mpesa_response_code || result.error_code || 'UNKNOWN'
      const errorMessage = result.details?.mpesa_response_description || result.error_message || 'Unknown error'

      // Check if we should retry again
      const shouldRetry = await supabaseClient.rpc('should_retry_disbursement', {
        p_status: 'failed',
        p_retry_count: retryAttempt,
        p_max_retries: disbursement.max_retries,
        p_mpesa_response_code: errorCode
      })

      let nextRetryAt = null
      if (shouldRetry.data && retryAttempt < disbursement.max_retries) {
        // Calculate next retry time
        const { data: nextRetryTime } = await supabaseClient.rpc('calculate_next_retry_time', {
          retry_count: retryAttempt,
          base_delay_minutes: 5
        })
        nextRetryAt = nextRetryTime
        console.log(`   ⏰ [Retry] Next retry scheduled for: ${nextRetryAt}`)
      } else {
        console.log(`   🛑 [Retry] Max retries exceeded or permanent failure - no more retries`)
      }

      // Update disbursement record with failure
      const { error: failureUpdateError } = await supabaseClient
        .from('disbursement_requests')
        .update({
          status: 'failed',
          result_code: errorCode,
          result_desc: errorMessage,
          next_retry_at: nextRetryAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', disbursementId)

      if (failureUpdateError) {
        console.error(`   ⚠️ [Retry] Failed to update failure status: ${failureUpdateError.message}`)
      }

      // Update retry log with failure details
      const { error: failureLogError } = await supabaseClient
        .from('disbursement_retry_logs')
        .update({
          mpesa_response_code: errorCode,
          mpesa_response_description: errorMessage,
          error_details: { 
            success: false, 
            error: result.error || result.error_message,
            details: result.details,
            should_retry: shouldRetry.data,
            next_retry_at: nextRetryAt
          }
        })
        .eq('disbursement_id', disbursementId)
        .eq('retry_attempt', retryAttempt)

      if (failureLogError) {
        console.error(`   ⚠️ [Retry] Failed to update retry log: ${failureLogError.message}`)
      }

      return {
        disbursement_id: disbursementId,
        success: false,
        retry_attempt: retryAttempt,
        error_code: errorCode,
        error_message: errorMessage,
        should_retry: shouldRetry.data,
        next_retry_at: nextRetryAt,
        message: 'Disbursement retry failed'
      }
    }

  } catch (error) {
    console.error(`   ❌ [Retry] Critical error in retry attempt:`, error.message)
    
    // Log the error
    const { error: logError } = await supabaseClient
      .from('disbursement_retry_logs')
      .update({
        error_details: { 
          success: false, 
          critical_error: error.message,
          stack: error.stack
        }
      })
      .eq('disbursement_id', disbursementId)
      .eq('retry_attempt', retryAttempt)

    if (logError) {
      console.error(`   ⚠️ [Retry] Failed to log critical error: ${logError.message}`)
    }

    throw error
  }
}








