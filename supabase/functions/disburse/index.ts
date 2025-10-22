import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CredentialManager } from '../_shared/credential-manager.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders()
  
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

    // 🛡️ CRITICAL: Check for duplicate disbursements BEFORE processing
    console.log('🔍 [Duplicate Check] Checking for existing disbursements...')
    
    // Check 1: Same client_request_id (idempotency)
    const { data: existingByRequestId } = await supabaseClient
      .from('disbursement_requests')
      .select('id, status, conversation_id, created_at, amount, msisdn')
      .eq('client_request_id', body.client_request_id)
      .eq('partner_id', partner.id)
      .single()

    if (existingByRequestId) {
      console.log('🚫 [Duplicate Check] Found existing request with same client_request_id:', existingByRequestId.id)
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'DUPLICATE_1001',
          error_message: `Request with client_request_id '${body.client_request_id}' already exists`,
          details: {
            existing_request_id: existingByRequestId.id,
            existing_status: existingByRequestId.status,
            existing_amount: existingByRequestId.amount,
            existing_msisdn: existingByRequestId.msisdn,
            created_at: existingByRequestId.created_at
          }
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check 2: Enhanced duplicate prevention with relaxed rules
    console.log('🔍 [Enhanced Duplicate Check] Using new relaxed duplicate prevention rules...')
    
    // Get client IP address
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') || 
                     '127.0.0.1'
    
    // Import and use the enhanced duplicate prevention service
    const { DuplicatePreventionService } = await import('../_shared/duplicate-prevention.ts')
    const duplicateService = new DuplicatePreventionService(supabaseClient)
    
    const duplicateCheck = await duplicateService.checkForDuplicates(
      partner.id,
      body.customer_id || body.msisdn, // Use customer_id if provided, fallback to msisdn
      body.msisdn,
      body.amount,
      clientIp,
      body.client_request_id
    )

    if (duplicateCheck.isDuplicate) {
      console.log('🚫 [Enhanced Duplicate Check] Duplicate detected:', duplicateCheck.blockReason)
      
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'DUPLICATE_1002',
          error_message: duplicateCheck.blockReason,
          details: {
            restriction_type: duplicateCheck.blockType,
            enhanced_duplicate_prevention: true,
            existing_request: duplicateCheck.existingRequest,
            block_reason: duplicateCheck.blockReason
          }
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Note: Rate limiting for same phone number is now handled by the enhanced duplicate prevention service
    // with configurable time windows (default 2 minutes instead of 1 hour)

    console.log('✅ [Duplicate Check] No duplicate disbursements found, proceeding with request')

    // Get credentials from vault
    const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
    let credentials
    try {
      console.log('🔑 [Credentials] Attempting to retrieve credentials for partner:', partner.name)
      console.log('🔑 [Credentials] Partner has encrypted_credentials:', !!partner.encrypted_credentials)
      console.log('🔑 [Credentials] Partner has plain text credentials:', {
        consumer_key: !!partner.consumer_key,
        consumer_secret: !!partner.consumer_secret,
        initiator_password: !!partner.initiator_password,
        security_credential: !!partner.security_credential
      })
      
      credentials = await CredentialManager.getPartnerCredentials(partner.id, vaultPassphrase, partner)
      console.log('✅ [Credentials] Successfully retrieved credentials from vault')
    } catch (vaultError) {
      console.error('❌ [Credentials] Vault credential retrieval failed for partner:', partner.name, vaultError)
      console.error('❌ [Credentials] Vault error details:', vaultError.message)
      
      // Fallback to plain text credentials
      if (partner.consumer_key && partner.consumer_secret && partner.initiator_password) {
        console.log('🔄 [Credentials] Using plain text credentials as fallback')
        credentials = {
          consumer_key: partner.consumer_key,
          consumer_secret: partner.consumer_secret,
          initiator_password: partner.initiator_password,
          security_credential: partner.security_credential || partner.initiator_password,
          initiator_name: partner.mpesa_initiator_name || 'default_initiator',
          shortcode: partner.mpesa_shortcode || '',
          environment: partner.mpesa_environment || 'sandbox'
        }
        console.log('✅ [Credentials] Plain text credentials configured successfully')
      } else {
        console.error('❌ [Credentials] No valid credentials found for partner:', partner.name)
        console.error('❌ [Credentials] Missing fields:', {
          consumer_key: !partner.consumer_key,
          consumer_secret: !partner.consumer_secret,
          initiator_password: !partner.initiator_password
        })
        throw new Error(`Failed to retrieve M-Pesa credentials for ${partner.name}: ${vaultError.message}`)
      }
    }

    const consumerKey = credentials.consumer_key
    const consumerSecret = credentials.consumer_secret
    const shortCode = credentials.shortcode || partner.mpesa_shortcode
    const initiatorPassword = credentials.initiator_password
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'

    console.log('🔍 [Credentials] Validating credential fields:', {
      consumer_key: !!consumerKey,
      consumer_secret: !!consumerSecret,
      shortcode: !!shortCode,
      initiator_password: !!initiatorPassword,
      environment: environment
    })

    if (!consumerKey || !consumerSecret || !shortCode) {
      console.error('❌ [Credentials] Missing required credential fields:', {
        consumer_key: !consumerKey,
        consumer_secret: !consumerSecret,
        shortcode: !shortCode
      })
      throw new Error('M-Pesa credentials not configured for this partner')
    }
    
    if (!initiatorPassword) {
      console.error('❌ [Credentials] Missing initiator password')
      throw new Error('M-Pesa InitiatorPassword not configured for this partner')
    }

    console.log('✅ [Credentials] All required credentials validated successfully')

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
    
    // Determine the correct initiator name
    const initiatorName = credentials.initiator_name || partner.mpesa_initiator_name || process.env.DEFAULT_INITIATOR_NAME || "default_initiator"
    
    console.log('🔍 [Initiator] Initiator name resolution:', {
      from_credentials: credentials.initiator_name,
      from_partner: partner.mpesa_initiator_name,
      from_env: process.env.DEFAULT_INITIATOR_NAME,
      final_initiator_name: initiatorName
    })
    
    const b2cRequest = {
      InitiatorName: initiatorName,
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
      InitiatorName: initiatorName,
      PartyA: shortCode,
      PartyB: body.msisdn,
      Amount: body.amount,
      CommandID: "BusinessPayment",
      Remarks: b2cRequest.Remarks,
      ResultURL: resultURL,
      QueueTimeOutURL: timeoutURL,
      Occasion: b2cRequest.Occasion,
      SecurityCredentialLength: securityCredential ? securityCredential.length : 0
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

    // 🛡️ CRITICAL FIX: Safe JSON parsing to prevent double disbursements
    let b2cData
    try {
      b2cData = await b2cResponse.json()
      console.log('✅ [M-Pesa Response] Successfully parsed JSON response:', JSON.stringify(b2cData, null, 2))
    } catch (jsonError) {
      console.error('❌ [M-Pesa Response] Invalid JSON response from Safaricom:', jsonError)
      
      // Get raw response for debugging
      const rawResponse = await b2cResponse.text()
      console.error('❌ [M-Pesa Response] Raw response:', rawResponse)
      
      // Return error WITHOUT creating any disbursement record
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1005',
          error_message: 'Invalid response format from M-Pesa service - JSON parsing failed',
          details: {
            raw_response: rawResponse.substring(0, 500), // Limit response size
            json_error: jsonError.message,
            http_status: b2cResponse.status,
            http_status_text: b2cResponse.statusText
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!b2cResponse.ok) {
      console.error('❌ [M-Pesa Response] HTTP error:', b2cResponse.status, b2cResponse.statusText)
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1006',
          error_message: `M-Pesa API HTTP error: ${b2cResponse.status} ${b2cResponse.statusText}`,
          details: {
            http_status: b2cResponse.status,
            http_status_text: b2cResponse.statusText,
            response_data: b2cData
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate response structure
    if (!b2cData || typeof b2cData.ResponseCode === 'undefined') {
      console.error('❌ [M-Pesa Response] Invalid response structure:', b2cData)
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1007',
          error_message: 'Invalid response structure from M-Pesa service',
          details: {
            response_data: b2cData,
            missing_fields: ['ResponseCode']
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if M-Pesa transaction was successful
    const isMpesaSuccess = b2cData.ResponseCode === '0'
    console.log('🔍 [M-Pesa Response] Transaction status:', {
      response_code: b2cData.ResponseCode,
      response_description: b2cData.ResponseDescription,
      is_success: isMpesaSuccess
    })

    // If M-Pesa transaction failed, return error WITHOUT creating disbursement record
    if (!isMpesaSuccess) {
      console.error('❌ [M-Pesa Response] Transaction rejected by M-Pesa:', b2cData.ResponseDescription)
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: b2cData.ResponseCode,
          error_message: b2cData.ResponseDescription || 'M-Pesa transaction failed',
          details: {
            mpesa_response_code: b2cData.ResponseCode,
            mpesa_response_description: b2cData.ResponseDescription,
            conversation_id: b2cData.ConversationID,
            originator_conversation_id: b2cData.OriginatorConversationID
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 🛡️ CRITICAL: Only create disbursement record AFTER successful M-Pesa response
    console.log('✅ [M-Pesa Response] Transaction accepted by M-Pesa, creating disbursement record...')
    
    const disbursementData: any = {
      origin: 'ussd',
      tenant_id: body.tenant_id,
      customer_id: body.customer_id,
      client_request_id: body.client_request_id,
      msisdn: body.msisdn,
      amount: body.amount,
      status: 'accepted', // Only create record for successful M-Pesa responses
      partner_id: partner.id,
      mpesa_shortcode: partner.mpesa_shortcode,
      conversation_id: b2cData.ConversationID,
      originator_conversation_id: b2cData.OriginatorConversationID
    }

    // Try to insert with conversation IDs first
    let { data: disbursementRequest, error: dbError } = await supabaseClient
      .from('disbursement_requests')
      .insert(disbursementData)
      .select()
      .single()

    // If insert fails, try fallback without conversation IDs
    if (dbError) {
      console.error('❌ [Database] Error with conversation IDs:', dbError)
      console.log('🔄 [Database] Attempting fallback insert without conversation IDs...')
      
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
        console.error('❌ [Database] Fallback insert also failed:', fallbackError)
        return new Response(
          JSON.stringify({
            status: 'rejected',
            error_code: 'DB_1001',
            error_message: `Database error: ${fallbackError.message}`,
            details: {
              mpesa_transaction_accepted: true,
              conversation_id: b2cData.ConversationID,
              database_error: fallbackError.message
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      disbursementRequest = fallbackRequest
      console.log('✅ [Database] Fallback insert successful (without conversation IDs)')
    } else {
      console.log('✅ [Database] Insert successful (with conversation IDs)')
    }

    // Log successful disbursement creation
    console.log('✅ [Disbursement] Successfully created disbursement record:', {
      disbursement_id: disbursementRequest?.id,
      conversation_id: b2cData.ConversationID,
      amount: body.amount,
      msisdn: body.msisdn,
      client_request_id: body.client_request_id
    })

    // Return success response
    return new Response(
      JSON.stringify({
        status: 'accepted',
        conversation_id: b2cData.ConversationID,
        originator_conversation_id: b2cData.OriginatorConversationID,
        disbursement_id: disbursementRequest?.id,
        details: {
          amount: body.amount,
          msisdn: body.msisdn,
          client_request_id: body.client_request_id,
          mpesa_response_code: b2cData.ResponseCode,
          mpesa_response_description: b2cData.ResponseDescription
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [Disbursement] Critical error occurred:', error)
    console.error('❌ [Disbursement] Error stack:', error.stack)
    
    // Determine error type and provide appropriate response
    let errorCode = 'B2C_1004'
    let errorMessage = 'M-Pesa service unavailable'
    let statusCode = 500
    
    if (error.message.includes('OAuth failed')) {
      errorCode = 'AUTH_1003'
      errorMessage = 'M-Pesa authentication failed'
    } else if (error.message.includes('credentials')) {
      errorCode = 'AUTH_1004'
      errorMessage = 'M-Pesa credentials configuration error'
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorCode = 'NETWORK_1001'
      errorMessage = 'Network error connecting to M-Pesa service'
    }
    
    return new Response(
      JSON.stringify({
        status: 'rejected',
        error_code: errorCode,
        error_message: errorMessage,
        details: {
          original_error: error.message,
          error_type: error.constructor.name,
          timestamp: new Date().toISOString(),
          note: 'No disbursement record was created due to this error'
        }
      }),
      { 
        status: statusCode, 
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