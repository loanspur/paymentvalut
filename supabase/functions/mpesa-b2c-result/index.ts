import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers (inline to avoid import issues)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
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
      console.log('✅ [M-Pesa Callback] Found balance request:', balanceRequest.id)
      
      // Extract balance information from ResultParameters
      let balanceBefore = null
      let balanceAfter = null
      let utilityAccountBalance = null

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
              balanceBefore = parseFloat(param.Value)
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
          callback_received_at: new Date().toISOString()
        })
        .eq('id', balanceRequest.id)

      if (updateError) {
        console.error('❌ [M-Pesa Callback] Error updating balance request:', updateError)
      } else {
        console.log('✅ [M-Pesa Callback] Balance request updated successfully:', {
          id: balanceRequest.id,
          status: finalStatus,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          utility_account_balance: utilityAccountBalance
        })
      }

      return new Response('OK', { status: 200 })
    }

    // If not a balance request, try to find a disbursement request by conversation ID
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
    let workingAccountBalance = null
    let chargesAccountBalance = null
    let customerName = null

    if (Result.ResultParameters?.ResultParameter) {
      console.log(`🔍 [M-Pesa Callback] Processing ${Result.ResultParameters.ResultParameter.length} parameters`)
      for (const param of Result.ResultParameters.ResultParameter) {
        console.log(`🔍 [M-Pesa Callback] Processing parameter: ${param.Key} = ${param.Value}`)
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
            console.log(`💰 [M-Pesa Callback] Utility Account Balance: ${utilityAccountBalance}`)
            break
          case 'B2CWorkingAccountAvailableFunds':
            workingAccountBalance = parseFloat(param.Value)
            console.log(`💰 [M-Pesa Callback] Working Account Balance: ${workingAccountBalance}`)
            break
          case 'B2CChargesPaidAccountAvailableFunds':
            chargesAccountBalance = parseFloat(param.Value)
            console.log(`💰 [M-Pesa Callback] Charges Account Balance: ${chargesAccountBalance}`)
            break
          // Additional balance parameter names that might be used
          case 'UtilityAccountAvailableFunds':
            if (utilityAccountBalance === null) {
              utilityAccountBalance = parseFloat(param.Value)
              console.log(`💰 [M-Pesa Callback] Utility Account Balance (alt): ${utilityAccountBalance}`)
            }
            break
          case 'WorkingAccountAvailableFunds':
            if (workingAccountBalance === null) {
              workingAccountBalance = parseFloat(param.Value)
              console.log(`💰 [M-Pesa Callback] Working Account Balance (alt): ${workingAccountBalance}`)
            }
            break
          case 'ChargesPaidAccountAvailableFunds':
            if (chargesAccountBalance === null) {
              chargesAccountBalance = parseFloat(param.Value)
              console.log(`💰 [M-Pesa Callback] Charges Account Balance (alt): ${chargesAccountBalance}`)
            }
            break
          case 'B2CRecipientIsRegisteredCustomer':
            // Whether recipient is registered
            break
          case 'ReceiverPartyName':
            customerName = param.Value
            console.log(`✅ [M-Pesa Callback] Found ReceiverPartyName: ${customerName}`)
            break
          case 'ReceiverPartyPublicName':
            // Extract customer name from format: "254727638940 - JUSTUS MURENGA WANJALA"
            const publicNameValue = param.Value
            if (publicNameValue && publicNameValue.includes(' - ')) {
              const extractedName = publicNameValue.split(' - ')[1].trim()
              if (extractedName && extractedName.length > 0) {
                customerName = extractedName
                console.log(`✅ [M-Pesa Callback] Found ReceiverPartyPublicName: ${publicNameValue}`)
                console.log(`✅ [M-Pesa Callback] Extracted customer name: ${customerName}`)
              }
            } else if (publicNameValue && publicNameValue.trim().length > 0) {
              customerName = publicNameValue.trim()
              console.log(`✅ [M-Pesa Callback] Found ReceiverPartyPublicName (no split): ${customerName}`)
            }
            break
          case 'B2CRecipientIsRegisteredCustomer':
            // This might contain customer name in some cases
            if (param.Value && param.Value !== 'true' && param.Value !== 'false') {
              customerName = param.Value
              console.log(`✅ [M-Pesa Callback] Found customer name in B2CRecipientIsRegisteredCustomer: ${customerName}`)
            }
            break
          default:
            // Check for balance-related parameters
            if (param.Key && param.Value && param.Key.toLowerCase().includes('balance')) {
              console.log(`💰 [M-Pesa Callback] Balance parameter found: ${param.Key} = ${param.Value}`)
              
              // Try to parse as number and assign to appropriate balance
              const balanceValue = parseFloat(param.Value)
              if (!isNaN(balanceValue)) {
                if (param.Key.toLowerCase().includes('utility') && utilityAccountBalance === null) {
                  utilityAccountBalance = balanceValue
                  console.log(`💰 [M-Pesa Callback] Assigned to utility balance: ${utilityAccountBalance}`)
                } else if (param.Key.toLowerCase().includes('working') && workingAccountBalance === null) {
                  workingAccountBalance = balanceValue
                  console.log(`💰 [M-Pesa Callback] Assigned to working balance: ${workingAccountBalance}`)
                } else if (param.Key.toLowerCase().includes('charges') && chargesAccountBalance === null) {
                  chargesAccountBalance = balanceValue
                  console.log(`💰 [M-Pesa Callback] Assigned to charges balance: ${chargesAccountBalance}`)
                }
              }
            }
            // Check for any other potential name fields
            else if (param.Key && param.Value && 
                (param.Key.toLowerCase().includes('name') || 
                 param.Key.toLowerCase().includes('party') ||
                 param.Key.toLowerCase().includes('recipient'))) {
              console.log(`🔍 [M-Pesa Callback] Potential name field found: ${param.Key} = ${param.Value}`)
              if (!customerName) {
                // Handle ReceiverPartyPublicName format in default case too
                if (param.Key === 'ReceiverPartyPublicName' && param.Value.includes(' - ')) {
                  const extractedName = param.Value.split(' - ')[1].trim()
                  if (extractedName && extractedName.length > 0) {
                    customerName = extractedName
                    console.log(`✅ [M-Pesa Callback] Extracted customer name from ${param.Key}: ${customerName}`)
                  }
                } else if (param.Value.trim().length > 0) {
                  customerName = param.Value.trim()
                  console.log(`✅ [M-Pesa Callback] Using ${param.Key} as customer name: ${customerName}`)
                }
              }
            }
            break
        }
      }
    }

    // Use receipt number as the primary M-Pesa transaction ID
    const mpesaTransactionId = receiptNumber || transactionId

    // Log the extracted data for debugging
    console.log('🔍 [M-Pesa Callback] Extracted data:', {
      conversationId,
      transactionId,
      receiptNumber,
      mpesaTransactionId,
      transactionAmount,
      transactionDate,
      utilityAccountBalance,
      workingAccountBalance,
      chargesAccountBalance,
      customerName,
      finalStatus
    })

    // Build update object with only basic columns that definitely exist
    const updateData: any = {
      status: finalStatus,
      result_code: Result.ResultCode.toString(),
      result_desc: Result.ResultDesc,
      updated_at: new Date().toISOString()
    }

    // Only add columns that we know exist from the basic schema
    if (mpesaTransactionId) {
      updateData.transaction_id = mpesaTransactionId
    }
    
    if (receiptNumber) {
      updateData.receipt_number = receiptNumber
    }
    
    if (transactionAmount !== null) {
      updateData.transaction_amount = transactionAmount
    }
    
    if (transactionDate) {
      updateData.transaction_date = transactionDate
    }
    
    if (customerName) {
      updateData.customer_name = customerName
    }
    
    // Add balance information if available
    if (utilityAccountBalance !== null) {
      updateData.utility_balance_at_transaction = utilityAccountBalance
    }
    
    if (workingAccountBalance !== null) {
      updateData.working_balance_at_transaction = workingAccountBalance
    }
    
    if (chargesAccountBalance !== null) {
      updateData.charges_balance_at_transaction = chargesAccountBalance
    }

    console.log('🔍 [M-Pesa Callback] Update data:', updateData)
    console.log('🔍 [M-Pesa Callback] Updating disbursement ID:', disbursementRequest.id)

    // Update the disbursement request status with balance information
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('disbursement_requests')
      .update(updateData)
      .eq('id', disbursementRequest.id)
      .select('id, utility_balance_at_transaction, working_balance_at_transaction, charges_balance_at_transaction')

    console.log('🔍 [M-Pesa Callback] Update result:', updateResult)
    console.log('🔍 [M-Pesa Callback] Update error:', updateError)

    if (updateError) {
      console.error('❌ [M-Pesa Callback] Error updating disbursement request:', updateError)
      
      // If the error is due to missing columns, try a fallback update with only basic fields
      if (updateError.code === 'PGRST204') {
        console.log('🔄 [M-Pesa Callback] Attempting fallback update with basic fields only')
        
        const fallbackData = {
          status: finalStatus,
          result_code: Result.ResultCode.toString(),
          result_desc: Result.ResultDesc,
          updated_at: new Date().toISOString()
        }
        
        // Only add fields that we know exist from the basic schema
        if (mpesaTransactionId) {
          fallbackData.transaction_id = mpesaTransactionId
        }
        
        if (receiptNumber) {
          fallbackData.receipt_number = receiptNumber
        }
        
        const { error: fallbackError } = await supabaseClient
          .from('disbursement_requests')
          .update(fallbackData)
          .eq('id', disbursementRequest.id)
        
        if (fallbackError) {
          console.error('❌ [M-Pesa Callback] Fallback update also failed:', fallbackError)
        } else {
          console.log('✅ [M-Pesa Callback] Fallback update successful')
        }
      }
    } else {
      console.log('✅ [M-Pesa Callback] Disbursement request updated successfully:', {
        id: disbursementRequest.id,
        status: finalStatus,
        receipt_number: receiptNumber,
        transaction_amount: transactionAmount,
        customer_name: customerName,
        utility_balance_stored: updateResult?.[0]?.utility_balance_at_transaction,
        working_balance_stored: updateResult?.[0]?.working_balance_at_transaction,
        charges_balance_stored: updateResult?.[0]?.charges_balance_at_transaction
      })
      
      // Verify the balance was actually stored
      if (updateResult && updateResult.length > 0) {
        const storedBalance = updateResult[0].utility_balance_at_transaction
        if (storedBalance !== null && storedBalance !== undefined) {
          console.log(`✅ [M-Pesa Callback] Balance verification: ${storedBalance} KES stored successfully`)
        } else {
          console.log(`⚠️ [M-Pesa Callback] Balance verification: Balance not stored (${storedBalance})`)
        }
      }
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

    // Send webhook to USSD backend if configured
    const ussdWebhookUrl = Deno.env.get('USSD_WEBHOOK_URL')
    let webhookDeliveryStatus = 'not_sent'
    let webhookError = null
    let webhookPayload = null
    let webhookResponse = null
    let responseBody = null
    
    if (ussdWebhookUrl && disbursementRequest.origin === 'ussd') {
      try {
        webhookPayload = {
          disbursement_id: disbursementRequest.id,
          conversation_id: conversationId,
          result_code: Result.ResultCode,
          result_desc: Result.ResultDesc,
          transaction_receipt: receiptNumber,
          amount: disbursementRequest.amount,
          msisdn: disbursementRequest.msisdn,
          customer_name: customerName,
          processed_at: new Date().toISOString(),
          status: finalStatus
        }

        console.log(`📤 [M-Pesa Callback] Sending webhook to USSD backend: ${ussdWebhookUrl}`)
        console.log(`📤 [M-Pesa Callback] Webhook payload:`, JSON.stringify(webhookPayload, null, 2))
        
        // Try to send webhook with SSL certificate bypass
        // Note: This is a workaround for self-signed certificates
        // In production, the USSD backend should use proper SSL certificates
        try {
          webhookResponse = await fetch(ussdWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'PaymentVault-MPesa-Webhook/1.0'
            },
            body: JSON.stringify(webhookPayload)
          })
        } catch (sslError) {
          // If SSL certificate error occurs, log it but don't fail the callback
          if (sslError.message.includes('invalid peer certificate') || sslError.message.includes('UnknownIssuer')) {
            console.error('❌ [M-Pesa Callback] SSL certificate validation failed for USSD backend')
            console.error('❌ [M-Pesa Callback] This is likely due to a self-signed certificate on the USSD backend')
            console.error('❌ [M-Pesa Callback] Webhook delivery failed, but callback processing continues')
            
            // Set error status but don't throw - callback processing should continue
            webhookDeliveryStatus = 'ssl_error'
            webhookError = `SSL certificate validation failed: ${sslError.message}`
            
            // Create a mock response object for logging
            webhookResponse = {
              ok: false,
              status: 0,
              statusText: 'SSL Certificate Error',
              text: () => Promise.resolve(sslError.message)
            }
          } else {
            throw sslError
          }
        }

        if (webhookResponse.ok) {
          console.log(`✅ [M-Pesa Callback] Webhook sent successfully to USSD backend (${webhookResponse.status})`)
          webhookDeliveryStatus = 'delivered'
          try {
            responseBody = await webhookResponse.text()
          } catch (e) {
            // Ignore error reading response body for successful requests
          }
        } else {
          try {
            responseBody = await webhookResponse.text()
          } catch (e) {
            responseBody = 'Unable to read response body'
          }
          console.error(`❌ [M-Pesa Callback] Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`)
          console.error(`❌ [M-Pesa Callback] Webhook error response:`, responseBody)
          webhookDeliveryStatus = 'failed'
          webhookError = `${webhookResponse.status} ${webhookResponse.statusText}: ${responseBody}`
        }
      } catch (webhookError) {
        console.error('❌ [M-Pesa Callback] Error sending webhook to USSD backend:', webhookError)
        webhookDeliveryStatus = 'error'
        webhookError = webhookError.message || webhookError.toString()
        // Don't fail the callback processing if webhook fails
      }
    } else if (disbursementRequest.origin === 'ussd') {
      console.warn('⚠️ [M-Pesa Callback] USSD webhook URL not configured, skipping webhook notification')
      webhookDeliveryStatus = 'not_configured'
    } else {
      console.log(`ℹ️ [M-Pesa Callback] Non-USSD transaction (origin: ${disbursementRequest.origin}), skipping webhook`)
      webhookDeliveryStatus = 'not_ussd'
    }
    
    // Log webhook delivery status
    console.log(`📊 [M-Pesa Callback] Webhook delivery status: ${webhookDeliveryStatus}`)
    if (webhookError) {
      console.log(`📊 [M-Pesa Callback] Webhook error: ${webhookError}`)
    }
    
    // Log webhook delivery attempt to database
    if (ussdWebhookUrl && disbursementRequest.origin === 'ussd') {
      try {
        await supabaseClient
          .from('webhook_delivery_logs')
          .insert({
            disbursement_id: disbursementRequest.id,
            webhook_url: ussdWebhookUrl,
            webhook_payload: webhookPayload,
            delivery_status: webhookDeliveryStatus,
            http_status_code: webhookResponse?.status || null,
            error_message: webhookError,
            response_body: responseBody,
            created_at: new Date().toISOString()
          })
      } catch (logError) {
        console.error('❌ [M-Pesa Callback] Error logging webhook delivery:', logError)
      }
    }

    return new Response('OK', { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })

  } catch (error) {
    return new Response('Error', { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }
})