import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers (inline to avoid import issues)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Allow all requests - Safaricom won't have authentication
  // This function must be accessible without authentication for M-Pesa callbacks

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
    // Process M-Pesa balance callback

    const { Result } = callbackData
    const conversationId = Result.ConversationID
    const originatorConversationId = Result.OriginatorConversationID
    const transactionId = Result.TransactionID

    // First, try to find a balance request by conversation ID
    let { data: balanceRequest, error: balanceError } = await supabaseClient
      .from('balance_requests')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    if (!balanceError && balanceRequest) {
      // Extract balance information from ResultParameters
      let balanceBefore = null
      let balanceAfter = null
      let utilityAccountBalance = null
      let workingAccountBalance = null
      let chargesAccountBalance = null

      if (Result.ResultParameters?.ResultParameter) {
        for (const param of Result.ResultParameters.ResultParameter) {
          switch (param.Key) {
            case 'AccountBalance':
              balanceAfter = parseFloat(param.Value)
              break
            case 'B2CUtilityAccountAvailableFunds':
              utilityAccountBalance = parseFloat(param.Value)
              break
            case 'B2CWorkingAccountAvailableFunds':
              workingAccountBalance = parseFloat(param.Value)
              break
            case 'B2CChargesAccountAvailableFunds':
              chargesAccountBalance = parseFloat(param.Value)
              break
          }
        }
      }

      // Determine the final status based on result code
      let finalStatus = 'failed'
      if (Result.ResultCode === 0) {
        finalStatus = 'completed'
      } else if (Result.ResultCode === 1) {
        finalStatus = 'pending'
      }

      // Update the balance request status with balance information
      const { error: updateError } = await supabaseClient
        .from('balance_requests')
        .update({
          status: finalStatus,
          result_code: Result.ResultCode.toString(),
          result_desc: Result.ResultDesc,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          utility_account_balance: utilityAccountBalance,
          working_account_balance: workingAccountBalance,
          charges_account_balance: chargesAccountBalance,
          callback_received_at: new Date().toISOString()
        })
        .eq('id', balanceRequest.id)

      if (updateError) {
        console.error('Error updating balance request:', updateError)
      }

      return new Response('OK', { status: 200 })
    }

    // If not a balance request, try to find a disbursement request
    // Not a balance request, checking disbursement requests
    
    let { data: disbursementRequest, error: findError } = await supabaseClient
      .from('disbursement_requests')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    // If not found by conversation_id, try to find by Occasion (disbursement ID)
    if (findError || !disbursementRequest) {
      // Disbursement not found by conversation_id, trying Occasion field
      
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
        // Trying to find disbursement by Occasion
        const { data: disbursementByOccasion, error: occasionError } = await supabaseClient
          .from('disbursement_requests')
          .select('*')
          .eq('id', occasion)
          .single()
        
        if (!occasionError && disbursementByOccasion) {
          disbursementRequest = disbursementByOccasion
          findError = null
          // Found disbursement by Occasion
        }
      }
    }

    if (findError || !disbursementRequest) {
      // No matching request found
      return new Response('OK', { status: 200 })
    }

    // Handle disbursement request (existing logic)
    // Found disbursement request

    // Extract transaction details from ResultParameters
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

    // Determine the final status based on result code
    let finalStatus = 'failed'
    if (Result.ResultCode === 0) {
      finalStatus = 'success'
    } else if (Result.ResultCode === 1) {
      finalStatus = 'pending'
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
      console.error('❌ [Balance Callback] Error updating disbursement request:', updateError)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('❌ [Balance Callback] Error processing callback:', error)
    return new Response('Error', { status: 500 })
  }
})
