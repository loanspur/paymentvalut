import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface MpesaResultCallback {
  Result: {
    ResultType: number
    ResultCode: number
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string
        Value: string
      }>
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response('Configuration error', { status: 500 })
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the callback data
    const callbackData: MpesaResultCallback = await req.json()
    console.log('🔔 M-Pesa callback received at test-callback:', JSON.stringify(callbackData, null, 2))

    const { Result } = callbackData
    const conversationId = Result.ConversationID
    const originatorConversationId = Result.OriginatorConversationID
    const transactionId = Result.TransactionID

    // Find the disbursement request by conversation ID
    let { data: disbursementRequest, error: findError } = await supabaseClient
      .from('disbursement_requests')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    // If not found by conversation_id, try to find by Occasion (disbursement ID)
    if (findError || !disbursementRequest) {
      console.log(`Disbursement not found by conversation_id: ${conversationId}, trying Occasion field`)
      
      // Extract Occasion from ResultParameters if available
      let occasion = null
      if (Result.ResultParameters?.ResultParameter) {
        for (const param of Result.ResultParameters.ResultParameter) {
          if (param.Key === 'Occasion') {
            occasion = param.Value
            break
          }
        }
      }
      
      if (occasion) {
        console.log(`Trying to find disbursement by Occasion: ${occasion}`)
        const { data: disbursementByOccasion, error: occasionError } = await supabaseClient
          .from('disbursement_requests')
          .select('*')
          .eq('id', occasion)
          .single()
        
        if (!occasionError && disbursementByOccasion) {
          disbursementRequest = disbursementByOccasion
          findError = null
          console.log(`Found disbursement by Occasion: ${occasion}`)
        }
      }
    }

    if (findError || !disbursementRequest) {
      console.log(`Disbursement not found for conversation_id: ${conversationId}`)
      return new Response('OK', { status: 200 })
    }

    // Determine the final status based on result code
    let finalStatus = 'failed'
    if (Result.ResultCode === 0) {
      finalStatus = 'success'
    } else if (Result.ResultCode === 1) {
      finalStatus = 'pending'
    }

    // Extract additional parameters if available
    let receiptNumber = null
    let transactionAmount = null
    let transactionDate = null
    let utilityAccountBalance = null

    if (Result.ResultParameters?.ResultParameter) {
      for (const param of Result.ResultParameters.ResultParameter) {
        switch (param.Key) {
          case 'TransactionReceipt':
            receiptNumber = param.Value
            break
          case 'TransactionAmount':
            transactionAmount = parseFloat(param.Value)
            break
          case 'TransactionDate':
            transactionDate = param.Value
            break
          case 'B2CUtilityAccountAvailableFunds':
            utilityAccountBalance = parseFloat(param.Value)
            break
          case 'B2CRecipientIsRegisteredCustomer':
            // Whether recipient is registered
            break
        }
      }
    }

    // Update the disbursement request status with balance information
    const { error: updateError } = await supabaseClient
      .from('disbursement_requests')
      .update({
        status: finalStatus,
        result_code: Result.ResultCode.toString(),
        result_desc: Result.ResultDesc,
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate,
        mpesa_utility_account_balance: utilityAccountBalance,
        balance_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', disbursementRequest.id)

    if (updateError) {
      console.error('Error updating disbursement request:', updateError)
    }

    // Log the result callback
    await supabaseClient
      .from('mpesa_callbacks')
      .insert({
        partner_id: disbursementRequest.partner_id,
        disbursement_id: disbursementRequest.id,
        callback_type: 'result',
        conversation_id: conversationId,
        originator_conversation_id: originatorConversationId,
        transaction_id: transactionId,
        result_code: Result.ResultCode.toString(),
        result_desc: Result.ResultDesc,
        receipt_number: receiptNumber,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate,
        raw_callback_data: callbackData,
        created_at: new Date().toISOString()
      })

    // Log balance history for utility account only
    if (utilityAccountBalance !== null) {
      await supabaseClient
        .from('mpesa_balance_history')
        .insert({
          partner_id: disbursementRequest.partner_id,
          disbursement_id: disbursementRequest.id,
          balance_type: 'utility',
          balance_amount: utilityAccountBalance,
          transaction_type: 'callback',
          transaction_reference: conversationId,
          balance_before: disbursementRequest.mpesa_utility_account_balance,
          balance_after: utilityAccountBalance,
          created_at: new Date().toISOString()
        })
    }

    console.log('✅ M-Pesa callback processed successfully in test-callback')
    
    return new Response('OK', { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })

  } catch (error) {
    console.error('❌ Error processing M-Pesa callback in test-callback:', error)
    return new Response('Error', { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }
})
