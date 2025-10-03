import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers (inline to avoid import issues)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}

interface MpesaTimeoutCallback {
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

  try {
    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response('Configuration error', { status: 500 })
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the callback data
    const callbackData: MpesaTimeoutCallback = await req.json()

    const { Result } = callbackData
    const conversationId = Result.ConversationID
    const originatorConversationId = Result.OriginatorConversationID

    // Find the disbursement request by conversation ID
    const { data: disbursementRequest, error: findError } = await supabaseClient
      .from('disbursement_requests')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    if (findError || !disbursementRequest) {
      return new Response('OK', { status: 200 })
    }

    // Update the disbursement request status
    const { error: updateError } = await supabaseClient
      .from('disbursement_requests')
      .update({
        status: 'timeout',
        result_code: Result.ResultCode.toString(),
        result_desc: Result.ResultDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', disbursementRequest.id)

    if (updateError) {
      // Log error but don't fail the callback
    }

    // Log the timeout callback
    await supabaseClient
      .from('mpesa_callbacks')
      .insert({
        partner_id: disbursementRequest.partner_id,
        disbursement_id: disbursementRequest.id,
        callback_type: 'timeout',
        conversation_id: conversationId,
        originator_conversation_id: originatorConversationId,
        result_code: Result.ResultCode.toString(),
        result_desc: Result.ResultDesc,
        raw_callback_data: callbackData,
        created_at: new Date().toISOString()
      })

    // Send webhook to USSD backend if configured
    const ussdWebhookUrl = Deno.env.get('USSD_WEBHOOK_URL')
    if (ussdWebhookUrl && disbursementRequest.origin === 'ussd') {
      try {
        const webhookPayload = {
          disbursement_id: disbursementRequest.id,
          conversation_id: conversationId,
          result_code: Result.ResultCode,
          result_desc: Result.ResultDesc,
          transaction_receipt: null,
          amount: disbursementRequest.amount,
          msisdn: disbursementRequest.msisdn,
          customer_name: disbursementRequest.customer_name,
          processed_at: new Date().toISOString(),
          status: 'timeout'
        }

        console.log(`📤 [M-Pesa Timeout] Sending webhook to USSD backend: ${ussdWebhookUrl}`)
        
        let webhookResponse
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
            console.error('❌ [M-Pesa Timeout] SSL certificate validation failed for USSD backend')
            console.error('❌ [M-Pesa Timeout] Webhook delivery failed, but callback processing continues')
            
            // Create a mock response object for logging
            webhookResponse = {
              ok: false,
              status: 0,
              statusText: 'SSL Certificate Error'
            }
          } else {
            throw sslError
          }
        }

        if (webhookResponse.ok) {
          console.log(`✅ [M-Pesa Timeout] Webhook sent successfully to USSD backend (${webhookResponse.status})`)
        } else {
          console.error(`❌ [M-Pesa Timeout] Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`)
        }
      } catch (webhookError) {
        console.error('❌ [M-Pesa Timeout] Error sending webhook to USSD backend:', webhookError)
        // Don't fail the callback processing if webhook fails
      }
    } else if (disbursementRequest.origin === 'ussd') {
      console.warn('⚠️ [M-Pesa Timeout] USSD webhook URL not configured, skipping timeout webhook notification')
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