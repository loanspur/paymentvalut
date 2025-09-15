import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { CredentialManager } from '../_shared/credential-manager.ts'

interface DisbursementParams {
  partnerId: string
  amount: number
  msisdn: string
  remarks: string
  occasion?: string
}

interface MpesaResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const params: DisbursementParams = await req.json()
    
    if (!params.partnerId || !params.amount || !params.msisdn) {
      throw new Error('Missing required parameters: partnerId, amount, msisdn')
    }

    console.log('🚀 Starting disbursement with vault credentials:', {
      partnerId: params.partnerId,
      amount: params.amount,
      msisdn: params.msisdn
    })

    // Get partner basic info (without credentials)
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('id, name, mpesa_shortcode, mpesa_environment, is_mpesa_configured, mpesa_initiator_name')
      .eq('id', params.partnerId)
      .single()

    if (partnerError || !partner || !partner.is_mpesa_configured) {
      console.log('❌ Partner M-Pesa credentials not configured:', {
        partnerError,
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          is_mpesa_configured: partner.is_mpesa_configured
        } : null
      })
      throw new Error('Partner M-Pesa credentials not configured')
    }

    // Get credentials from vault
    const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
    
    let credentials
    try {
      credentials = await CredentialManager.getPartnerCredentials(params.partnerId, vaultPassphrase)
      console.log('✅ Credentials retrieved from vault:', {
        partnerId: params.partnerId,
        hasConsumerKey: !!credentials.consumer_key,
        hasConsumerSecret: !!credentials.consumer_secret,
        hasInitiatorPassword: !!credentials.initiator_password,
        environment: credentials.environment
      })
    } catch (vaultError) {
      console.log('❌ Failed to retrieve credentials from vault:', vaultError)
      throw new Error('Failed to retrieve M-Pesa credentials from vault')
    }

    const consumerKey = credentials.consumer_key
    const consumerSecret = credentials.consumer_secret
    const shortCode = partner.mpesa_shortcode
    const passkey = credentials.passkey
    const initiatorPassword = credentials.initiator_password
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'

    if (!consumerKey || !consumerSecret || !shortCode) {
      throw new Error('M-Pesa credentials not configured for this partner')
    }
    
    if (!initiatorPassword) {
      console.log('❌ M-Pesa InitiatorPassword not configured for partner:', {
        partnerId: params.partnerId,
        hasInitiatorPassword: !!initiatorPassword
      })
      throw new Error('M-Pesa InitiatorPassword not configured for this partner')
    }
    
    // Note: Passkey is not required for B2C transactions according to Safaricom
    
    console.log('✅ M-Pesa credentials loaded from vault:', {
      partnerId: params.partnerId,
      shortCode,
      environment,
      hasInitiatorPassword: !!initiatorPassword,
      initiatorName: partner.mpesa_initiator_name
    })

    // Get access token
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
      
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`
      }
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      console.log('❌ M-Pesa Token Error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: tokenData
      })
      throw new Error(`M-Pesa token error: ${tokenResponse.status} - ${JSON.stringify(tokenData)}`)
    }
    
    const accessToken = tokenData.access_token
    
    if (!accessToken) {
      console.log('❌ No access token in response:', tokenData)
      throw new Error('No access token received from M-Pesa')
    }

    // Prepare B2C request
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
    const conversationId = `AG_${timestamp}${Math.random().toString(36).substr(2, 9)}`
    
    // Generate SecurityCredential (encrypted initiator password)
    // This is the encrypted credential provided by Safaricom/Daraja
    const securityCredential = initiatorPassword

    const b2cRequest = {
      InitiatorName: partner.mpesa_initiator_name || 'testapi',
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: Math.round(params.amount),
      PartyA: shortCode,
      PartyB: params.msisdn,
      Remarks: params.remarks || 'B2C Disbursement',
      QueueTimeOutURL: `${Deno.env.get('CALLBACK_BASE_URL') || 'https://cbsvault.co.ke'}/api/mpesa-callback/timeout`,
      ResultURL: `${Deno.env.get('CALLBACK_BASE_URL') || 'https://cbsvault.co.ke'}/api/mpesa-callback/result`,
      Occasion: params.occasion || 'B2C Payment'
    }

    console.log('📤 Sending B2C request:', {
      conversationId,
      amount: params.amount,
      msisdn: params.msisdn,
      shortCode,
      environment
    })

    // Send B2C request
    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cRequest)
    })

    const b2cData: MpesaResponse = await b2cResponse.json()
    
    console.log('📥 B2C Response:', {
      status: b2cResponse.status,
      response: b2cData
    })

    if (!b2cResponse.ok) {
      throw new Error(`B2C request failed: ${b2cResponse.status} - ${JSON.stringify(b2cData)}`)
    }

    // Store disbursement request
    const { data: disbursement, error: disbursementError } = await supabaseClient
      .from('disbursement_requests')
      .insert({
        partner_id: params.partnerId,
        amount: params.amount,
        msisdn: params.msisdn,
        conversation_id: b2cData.ConversationID,
        originator_conversation_id: b2cData.OriginatorConversationID,
        status: 'pending',
        remarks: params.remarks,
        occasion: params.occasion,
        result_code: b2cData.ResponseCode,
        result_desc: b2cData.ResponseDescription
      })
      .select()
      .single()

    if (disbursementError) {
      console.log('❌ Error storing disbursement:', disbursementError)
      throw new Error('Failed to store disbursement request')
    }

    console.log('✅ Disbursement request stored:', disbursement.id)

    return new Response(
      JSON.stringify({
        success: true,
        disbursement: {
          id: disbursement.id,
          conversation_id: b2cData.ConversationID,
          originator_conversation_id: b2cData.OriginatorConversationID,
          status: 'pending',
          amount: params.amount,
          msisdn: params.msisdn,
          result_code: b2cData.ResponseCode,
          result_desc: b2cData.ResponseDescription
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Disbursement error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
