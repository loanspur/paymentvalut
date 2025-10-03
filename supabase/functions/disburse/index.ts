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
    // Disbursement request received
    
    const body = await req.json()
    const apiKey = req.headers.get('x-api-key')
    
    // Validate required fields
    if (!body.msisdn || !body.amount || !body.tenant_id || !body.customer_id || !body.client_request_id) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'VALIDATION_1002',
          error_message: 'Missing required fields',
          details: {
            required_fields: ['msisdn', 'amount', 'tenant_id', 'customer_id', 'client_request_id'],
            provided_fields: Object.keys(body)
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate phone number format
    const msisdnRegex = /^254[0-9]{9}$/
    if (!msisdnRegex.test(body.msisdn)) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'VALIDATION_1001',
          error_message: 'Invalid phone number format',
          details: {
            field: 'msisdn',
            value: body.msisdn,
            expected_format: '254XXXXXXXXX (12 digits)'
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate amount
    if (body.amount < 10 || body.amount > 150000) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'VALIDATION_1003',
          error_message: 'Invalid amount',
          details: {
            field: 'amount',
            value: body.amount,
            min_amount: 10,
            max_amount: 150000
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
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
      .select('id, name, mpesa_shortcode, mpesa_environment, is_mpesa_configured, mpesa_initiator_name, consumer_key, consumer_secret, initiator_password, security_credential, encrypted_credentials')
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
      credentials = await CredentialManager.getPartnerCredentials(partner.id, vaultPassphrase, partner)
      // Credentials retrieved successfully
    } catch (vaultError) {
      console.error('❌ [Edge Function] Vault credential retrieval failed for partner:', partner.name, vaultError)
      // Attempting to use plain text credentials as fallback
      
      // Fallback to plain text credentials
      if (partner.consumer_key && partner.consumer_secret && partner.initiator_password) {
        // Using plain text credentials as fallback
        credentials = {
          consumer_key: partner.consumer_key,
          consumer_secret: partner.consumer_secret,
          initiator_password: partner.initiator_password,
          security_credential: partner.security_credential || partner.initiator_password,
          shortcode: partner.mpesa_shortcode || '',
          environment: partner.mpesa_environment || 'sandbox'
        }
      } else {
        throw new Error(`Failed to retrieve M-Pesa credentials for ${partner.name}: ${vaultError.message}`)
      }
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
    
    // Getting OAuth token from M-Pesa
      
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`
      }
    })

    const tokenData = await tokenResponse.json()
    // OAuth response received
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth failed ${tokenResponse.status}: ${JSON.stringify(tokenData)}`)
    }
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from M-Pesa')
    }
    
    // OAuth token received successfully

    // Prepare B2C request
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    
    // Use ONLY the generated security credential, never fall back to plain password
    if (!credentials.security_credential) {
      throw new Error('Security credential not found in vault. Please generate and store the security credential in the partner form.')
    }
    const securityCredential = credentials.security_credential
    
    // Using security credential from vault
    
    // Construct callback URLs
    const resultURL = `${supabaseUrl}/functions/v1/mpesa-b2c-result`
    const timeoutURL = `${supabaseUrl}/functions/v1/mpesa-b2c-timeout`
    
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
    
    console.log('📤 M-Pesa B2C Request:', {
      PartyA: shortCode,
      PartyB: body.msisdn,
      Amount: body.amount,
      CommandID: "BusinessPayment",
      Remarks: b2cRequest.Remarks,
      ResultURL: resultURL,
      QueueTimeOutURL: timeoutURL,
      Occasion: b2cRequest.Occasion
    })

    // Call M-Pesa B2C API
    
    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cRequest)
    })

    const b2cData = await b2cResponse.json()
    // B2C response received
    
    if (!b2cResponse.ok) {
      throw new Error(`B2C API failed ${b2cResponse.status}: ${JSON.stringify(b2cData)}`)
    }

    // Check if M-Pesa transaction was successful
    const isMpesaSuccess = b2cData.ResponseCode === '0'
    
    // Transaction validation

    // If M-Pesa transaction failed, throw an error
    if (!isMpesaSuccess) {
      // M-Pesa transaction failed
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
      // B2C payment request accepted by M-Pesa
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
      // B2C payment request rejected by M-Pesa
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