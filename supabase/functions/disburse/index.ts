import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CredentialManager } from '../_shared/credential-manager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 [Edge Function] Disbursement request received')
    
    const body = await req.json()
    const apiKey = req.headers.get('x-api-key')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'AUTH_1002',
          error_message: 'Invalid API key'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Validate API key
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('id, name, mpesa_shortcode, mpesa_environment, is_mpesa_configured, mpesa_initiator_name')
      .eq('api_key_hash', await hashAPIKey(apiKey))
      .eq('is_active', true)
      .single()

    if (partnerError || !partner || !partner.is_mpesa_configured) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'AUTH_1002',
          error_message: 'Invalid API key'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get credentials from vault
    const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
    let credentials
    try {
      credentials = await CredentialManager.getPartnerCredentials(partner.id, vaultPassphrase)
    } catch (vaultError) {
      throw new Error(`Failed to retrieve M-Pesa credentials for ${partner.name}: ${vaultError.message}`)
    }

    const consumerKey = credentials.consumer_key
    const consumerSecret = credentials.consumer_secret
    const shortCode = credentials.shortcode || partner.mpesa_shortcode
    const initiatorPassword = credentials.initiator_password
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'

    if (!consumerKey || !consumerSecret || !shortCode) {
      throw new Error('M-Pesa credentials not configured for this partner')
    }
    
    if (!initiatorPassword) {
      throw new Error('M-Pesa InitiatorPassword not configured for this partner')
    }

    // Get access token with explicit logging
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
    
    console.log('🎫 [Daraja] Getting OAuth token from:', baseUrl)
    console.log('🎫 [Daraja] Using consumer key:', consumerKey.substring(0, 10) + '...')
      
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`
      }
    })

    const tokenData = await tokenResponse.json()
    console.log('🎫 [Daraja] OAuth response status:', tokenResponse.status)
    console.log('🎫 [Daraja] OAuth response body:', JSON.stringify(tokenData, null, 2))
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth failed ${tokenResponse.status}: ${JSON.stringify(tokenData)}`)
    }
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from M-Pesa')
    }
    
    console.log('✅ [Daraja] OAuth token received successfully')

    // Prepare B2C request
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    
    // Use ONLY the generated security credential, never fall back to plain password
    if (!credentials.security_credential) {
      throw new Error('Security credential not found in vault. Please generate and store the security credential in the partner form.')
    }
    const securityCredential = credentials.security_credential
    
    console.log('🔐 [Daraja] Using security credential from vault (length):', securityCredential.length)
    
    // Debug: Log the callback URLs being constructed
    const resultURL = `${supabaseUrl}/functions/v1/mpesa-b2c-result`
    const timeoutURL = `${supabaseUrl}/functions/v1/mpesa-b2c-timeout`
    
    console.log('🔗 [Daraja] Callback URLs being sent to M-Pesa:')
    console.log('🔗 [Daraja] ResultURL:', resultURL)
    console.log('🔗 [Daraja] QueueTimeOutURL:', timeoutURL)
    console.log('🔗 [Daraja] Supabase URL:', supabaseUrl)
    
    const b2cRequest = {
      InitiatorName: credentials.initiator_name || partner.mpesa_initiator_name || process.env.DEFAULT_INITIATOR_NAME || "default_initiator",
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: body.amount,
      PartyA: shortCode,
      PartyB: body.msisdn,
      Remarks: `Disbursement ${body.client_request_id || 'manual'}`,
      QueueTimeOutURL: timeoutURL,
      ResultURL: resultURL,
      Occasion: body.client_request_id || 'manual'
    }

    // Call M-Pesa B2C API with explicit logging
    console.log('📤 [Daraja] Making B2C payment request to:', `${baseUrl}/mpesa/b2c/v1/paymentrequest`)
    console.log('📤 [Daraja] B2C request payload:', JSON.stringify(b2cRequest, null, 2))
    
    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cRequest)
    })

    const b2cData = await b2cResponse.json()
    console.log('📥 [Daraja] B2C response status:', b2cResponse.status)
    console.log('📥 [Daraja] B2C response body:', JSON.stringify(b2cData, null, 2))
    
    if (!b2cResponse.ok) {
      throw new Error(`B2C API failed ${b2cResponse.status}: ${JSON.stringify(b2cData)}`)
    }

    // Check if M-Pesa transaction was successful
    const isMpesaSuccess = b2cData.ResponseCode === '0'
    
    console.log('🔍 [Daraja] Transaction validation:', {
      responseCode: b2cData.ResponseCode,
      responseDescription: b2cData.ResponseDescription,
      conversationId: b2cData.ConversationID,
      originatorConversationId: b2cData.OriginatorConversationID,
      isMpesaSuccess
    })

    // If M-Pesa transaction failed, throw an error
    if (!isMpesaSuccess) {
      console.log('⚠️ [Daraja] M-Pesa transaction failed:', b2cData.ResponseDescription)
      throw new Error(`M-Pesa transaction failed: ${b2cData.ResponseDescription || 'Unknown error'}`)
    }

    // Create disbursement request record (only with basic columns that definitely exist)
    const disbursementData: any = {
      origin: 'ussd', // Use 'ussd' instead of 'api' to satisfy database constraint
      tenant_id: body.tenant_id,
      customer_id: body.customer_id,
      client_request_id: body.client_request_id,
      msisdn: body.msisdn,
      amount: body.amount,
      status: b2cData.ResponseCode === '0' ? 'accepted' : 'failed', // Use 'accepted' instead of 'pending'
      partner_id: partner.id,
      mpesa_shortcode: partner.mpesa_shortcode,
      conversation_id: b2cData.ConversationID, // Add conversation ID for callback matching
      originator_conversation_id: b2cData.OriginatorConversationID // Add originator conversation ID
    }

    // Try to insert with conversation IDs first
    let { data: disbursementRequest, error: dbError } = await supabaseClient
      .from('disbursement_requests')
      .insert(disbursementData)
      .select()
      .single()

    // If insert fails, try fallback without conversation IDs
    if (dbError) {
      console.error('Database error with conversation IDs:', dbError)
      console.log('🔄 Attempting fallback insert without conversation IDs...')
      
      // Create fallback data without conversation IDs
      const fallbackData = {
        origin: disbursementData.origin,
        tenant_id: disbursementData.tenant_id,
        customer_id: disbursementData.customer_id,
        client_request_id: disbursementData.client_request_id,
        msisdn: disbursementData.msisdn,
        amount: disbursementData.amount,
        status: disbursementData.status,
        partner_id: disbursementData.partner_id,
        mpesa_shortcode: disbursementData.mpesa_shortcode
      }
      
      const { data: fallbackRequest, error: fallbackError } = await supabaseClient
        .from('disbursement_requests')
        .insert(fallbackData)
        .select()
        .single()
      
      if (fallbackError) {
        console.error('Fallback insert also failed:', fallbackError)
        return new Response(
          JSON.stringify({
            status: 'rejected',
            error_code: 'DB_1001',
            error_message: `Database error: ${fallbackError.message}`
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      disbursementRequest = fallbackRequest
      console.log('✅ Fallback insert successful (without conversation IDs)')
    } else {
      console.log('✅ Insert successful (with conversation IDs)')
    }

    // Return response based on M-Pesa response
    if (b2cData.ResponseCode === '0') {
      console.log('✅ [Daraja] B2C payment request accepted by M-Pesa')
      return new Response(
        JSON.stringify({
          status: 'accepted',
          conversation_id: b2cData.ConversationID,
          originator_conversation_id: b2cData.OriginatorConversationID,
          disbursement_id: disbursementRequest?.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.log('❌ [Daraja] B2C payment request rejected by M-Pesa:', b2cData.ResponseDescription)
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: b2cData.ResponseCode,
          error_message: b2cData.ResponseDescription
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in disbursement:', error)
    return new Response(
      JSON.stringify({
        status: 'rejected',
        error_code: 'B2C_1004',
        error_message: error.message || 'M-Pesa service unavailable'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to hash API key
async function hashAPIKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}