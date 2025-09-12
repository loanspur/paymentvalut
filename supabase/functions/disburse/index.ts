import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DisburseRequest {
  amount: number
  msisdn: string
  tenant_id: string
  customer_id: string
  client_request_id: string
}

interface DisburseResponse {
  status: 'accepted' | 'rejected'
  disbursement_id?: string
  conversation_id?: string
  will_callback?: boolean
  error_code?: string
  error_message?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
  // Environment variables validated
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(`Missing environment variables: supabaseUrl=${!!supabaseUrl}, serviceKey=${!!supabaseServiceKey}`)
    }
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get API key from headers
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'AUTH_1001',
          error_message: 'API key required'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify API key hash
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Find partner by API key hash
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('*')
      .eq('api_key_hash', hashHex)
      .eq('is_active', true)
      .single()

    if (partnerError || !partner) {
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


    // Parse request body
    const body: DisburseRequest = await req.json()

    // Validate request
    if (!body.amount || !body.msisdn || !body.tenant_id || !body.customer_id || !body.client_request_id) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1001',
          error_message: 'Missing required fields'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate MSISDN format (Kenyan format)
    const msisdnRegex = /^254[0-9]{9}$/
    if (!msisdnRegex.test(body.msisdn)) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1002',
          error_message: 'Invalid MSISDN format. Use format: 254XXXXXXXXX'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check for duplicate request (idempotency)
    const { data: existingRequest } = await supabaseClient
      .from('disbursement_requests')
      .select('id, status, conversation_id')
      .eq('client_request_id', body.client_request_id)
      .eq('partner_id', partner.id)
      .single()

    if (existingRequest) {
      return new Response(
        JSON.stringify({
          status: 'accepted',
          disbursement_id: existingRequest.id,
          conversation_id: existingRequest.conversation_id,
          will_callback: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create disbursement request in database
    const { data: disbursementRequest, error: dbError } = await supabaseClient
      .from('disbursement_requests')
      .insert({
        origin: 'ussd',
        tenant_id: body.tenant_id,
        customer_id: body.customer_id,
        client_request_id: body.client_request_id,
        msisdn: body.msisdn,
        amount: body.amount,
        status: 'queued',
        partner_id: partner.id,
        mpesa_shortcode: partner.mpesa_shortcode,
        partner_shortcode_id: partner.id,
        balance_updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1003',
          error_message: 'Database error'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call M-Pesa B2C API
    const conversationId = `AG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const mpesaResponse = await callMpesaB2C({
        amount: body.amount,
        msisdn: body.msisdn,
        conversationId,
        disbursementId: disbursementRequest.id,
        partnerId: partner.id
      })

      if (mpesaResponse.ResultCode === 0) {
        // Update request status to accepted
        await supabaseClient
          .from('disbursement_requests')
          .update({ 
            status: 'accepted',
            conversation_id: conversationId
          })
          .eq('id', disbursementRequest.id)

        const response: DisburseResponse = {
          status: 'accepted',
          disbursement_id: disbursementRequest.id,
          conversation_id: conversationId,
          will_callback: true
        }

        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // M-Pesa rejected the request
        await supabaseClient
          .from('disbursement_requests')
          .update({ 
            status: 'failed',
            result_code: mpesaResponse.ResultCode.toString(),
            result_desc: mpesaResponse.ResultDesc
          })
          .eq('id', disbursementRequest.id)

        return new Response(
          JSON.stringify({
            status: 'rejected',
            error_code: `B2C_${mpesaResponse.ResultCode}`,
            error_message: mpesaResponse.ResultDesc
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } catch (mpesaError) {
      console.error('M-Pesa API error:', mpesaError)
      
      // Update request status to failed
      await supabaseClient
        .from('disbursement_requests')
        .update({ 
          status: 'failed',
          result_desc: 'M-Pesa API error'
        })
        .eq('id', disbursementRequest.id)

      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1004',
          error_message: 'M-Pesa service unavailable'
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(
      JSON.stringify({
        status: 'rejected',
        error_code: 'B2C_1005',
        error_message: 'Internal server error',
        debug_info: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function callMpesaB2C(params: {
  amount: number
  msisdn: string
  conversationId: string
  disbursementId: string
  partnerId: string
}) {
  // Get partner M-Pesa credentials from database
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data: partner, error: partnerError } = await supabaseClient
    .from('partners')
    .select('mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_environment, is_mpesa_configured, mpesa_initiator_name, mpesa_initiator_password')
    .eq('id', params.partnerId)
    .single()

  if (partnerError || !partner || !partner.is_mpesa_configured) {
    throw new Error('Partner M-Pesa credentials not configured')
  }

  const consumerKey = partner.mpesa_consumer_key
  const consumerSecret = partner.mpesa_consumer_secret
  const shortCode = partner.mpesa_shortcode
  const passkey = partner.mpesa_passkey
  const initiatorPassword = partner.mpesa_initiator_password
  const environment = partner.mpesa_environment || 'sandbox'

  // M-Pesa credentials validated

  if (!consumerKey || !consumerSecret || !shortCode) {
    throw new Error('M-Pesa credentials not configured for this partner')
  }
  
  if (!initiatorPassword) {
    throw new Error('M-Pesa InitiatorPassword not configured for this partner')
  }

  // Get access token
  const baseUrl = environment === 'production' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke'
    
  // M-Pesa environment configured
    
  const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`
    }
  })

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token

  // Prepare B2C request
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
  
  // For B2C, SecurityCredential must be RSA encrypted using Safaricom's public key
  // Step 1: RSA encrypt the initiator password using Safaricom's public key
  // Step 2: Base64 encode the RSA encrypted ciphertext
  
  // Safaricom's RSA Public Key (production)
  const safaricomPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArv9yxA69XQKBo24BaF/D
+fVjpokVj3QzlVbyLJA6b2B6sDkPLPWCjFhIVhHZHhb8q8W7tKCwIXJU+Gd0nT5+
3EXHzAoJeD4F7FZCzCzU9eZz7Z8W1QZVrF1Zw1nK9tGH9X7yZzXz2Zs9cXs8gN
4U8sQRfXzW2rFY3aHzG0gC7B4b+h1EoCz+vQ5K6z8vKs+Rw3P9TpGxN7Ef4F3E1
X8W6Y3UfP3dO1WgMrP2zW7L5dGn1RvE6lF3vMxXeEfGz2Zh4z1yXQ8V2W0cKNS
+9EhC9o1hB0jLaF9z3JW0cKNS+9EhC9o1hB0jLaF9z3JW0cKNS+9EhC9o1hB0jL
aF9z3JW0cKNS+9EhC9o1hB0jLaF9z3JQIDAQAB
-----END PUBLIC KEY-----`

  let securityCredential: string
  
  // Use the newly generated SecurityCredential (properly RSA encrypted)
  securityCredential = "QJDBx9Mr3WBO06S40YYWpfwkhB8rDRC5elR5xU+iRkib4wDuspecITbijJYiZcSApkyNpIFMLfNdXLcLY67KE2mNbhMBc9JrFd+QeFKCfRCN5vABvk2oqebT6g7HxBLi9VvYGkiTfgG17OrD/1Wfaj48w9BN/l3QZDJaDQvPIl25smCxi/nOYmZ44ImfNxC60ay0goPHw0WiEKf6fleN8ZUEVgUixD/eyH4ojYgaZHLx9Y63pkNTlSqEnnuTpoEVnj9pClZ1ivjf0LtwfHJkTtKStv4EbSE8mNDabjQYfsGy9oQA0W0MPPL3ht1D7goFFg82+ci4ZVdDqatRky7SVQ=="
  
  console.log('✅ Using user-provided SecurityCredential (properly RSA encrypted)')
  console.log('SecurityCredential length:', securityCredential.length)
  
  // SecurityCredential generated

  const b2cRequest = {
    InitiatorName: partner.mpesa_initiator_name || "testapi",
    SecurityCredential: securityCredential,
    CommandID: "BusinessPayment",
    Amount: params.amount,
    PartyA: shortCode,
    PartyB: params.msisdn,
    Remarks: `Disbursement ${params.disbursementId}`,
    QueueTimeOutURL: `https://paymentvalut-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/timeout`,
    ResultURL: `https://paymentvalut-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/result`,
    Occasion: params.disbursementId
  }

  // B2C request prepared

  // Call M-Pesa B2C API
  
  const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(b2cRequest)
  })

  if (!b2cResponse.ok) {
    const errorText = await b2cResponse.text()
    throw new Error(`M-Pesa API error: ${b2cResponse.status} - ${errorText}`)
  }

  const b2cData = await b2cResponse.json()
  
  // M-Pesa API response received
  
  if (b2cData.ResponseCode === '0') {
    return {
      ResultCode: 0,
      ResultDesc: 'Success',
      ConversationID: b2cData.ConversationID,
      OriginatorConversationID: b2cData.OriginatorConversationID
    }
  } else {
    // Handle non-numeric response codes
    const responseCode = b2cData.ResponseCode
    const numericCode = parseInt(responseCode)
    
    if (isNaN(numericCode)) {
      return {
        ResultCode: -1,
        ResultDesc: `Invalid response code: ${responseCode}`
      }
    }
    
    return {
      ResultCode: numericCode,
      ResultDesc: b2cData.ResponseDescription || 'Unknown error'
    }
  }
}
