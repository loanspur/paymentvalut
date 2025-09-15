import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Credential Manager - Embedded version
interface EncryptedCredentials {
  consumer_key: string
  consumer_secret: string
  passkey?: string
  initiator_name?: string
  initiator_password: string
  environment: string
  migrated_at?: string
}

interface DecryptedCredentials {
  consumer_key: string
  consumer_secret: string
  passkey?: string
  initiator_name?: string
  initiator_password: string
  environment: string
  migrated_at?: string
}

class CredentialManager {
  private static readonly IV_LENGTH = 12

  // Simple decryption function for base64 encoded credentials
  static async decryptCredentials(encryptedData: string, passphrase: string): Promise<DecryptedCredentials> {
    try {
      // For now, we'll use simple base64 decoding
      // In production, you should use proper AES-GCM encryption
      const decoded = atob(encryptedData)
      const credentials = JSON.parse(decoded)
      return credentials
    } catch (error) {
      throw new Error('Failed to decrypt credentials')
    }
  }

  // Get credentials for a partner (with decryption)
  static async getPartnerCredentials(partnerId: string, passphrase: string): Promise<DecryptedCredentials> {
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get encrypted credentials from database
    const { data: partner, error } = await supabase
      .from('partners')
      .select('encrypted_credentials')
      .eq('id', partnerId)
      .single()

    if (error || !partner) {
      throw new Error('Partner not found')
    }

    if (!partner.encrypted_credentials) {
      throw new Error('No encrypted credentials found for partner')
    }

    // Decrypt credentials
    return await this.decryptCredentials(partner.encrypted_credentials, passphrase)
  }
}

interface DisbursementParams {
  partner_id: string
  amount: number
  msisdn: string
  remarks?: string
  occasion?: string
  tenant_id?: string
  customer_id?: string
  client_request_id?: string
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
    
    if (!params.partner_id || !params.amount || !params.msisdn) {
      throw new Error('Missing required parameters: partner_id, amount, msisdn')
    }

    console.log('🚀 Starting disbursement with vault credentials:', {
      partner_id: params.partner_id,
      amount: params.amount,
      msisdn: params.msisdn
    })

    // Get partner basic info (without credentials)
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('id, name, mpesa_shortcode, mpesa_environment, is_mpesa_configured, mpesa_initiator_name')
      .eq('id', params.partner_id)
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
      credentials = await CredentialManager.getPartnerCredentials(params.partner_id, vaultPassphrase)
      console.log('✅ Credentials retrieved from vault:', {
        partner_id: params.partner_id,
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
    const securityCredential = credentials.security_credential
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'

    if (!consumerKey || !consumerSecret || !shortCode) {
      throw new Error('M-Pesa credentials not configured for this partner')
    }
    
    if (!securityCredential) {
      console.log('❌ M-Pesa SecurityCredential not configured for partner:', {
        partner_id: params.partner_id,
        hasSecurityCredential: !!securityCredential,
        hasInitiatorPassword: !!initiatorPassword
      })
      throw new Error('M-Pesa SecurityCredential not configured for this partner')
    }
    
    // Note: Passkey is not required for B2C transactions according to Safaricom
    
    console.log('✅ M-Pesa credentials loaded from vault:', {
      partner_id: params.partner_id,
      shortCode,
      environment,
      hasSecurityCredential: !!securityCredential,
      hasInitiatorPassword: !!initiatorPassword,
      initiatorName: partner.mpesa_initiator_name
    })

    // Get access token
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
      
    console.log('🔑 Getting M-Pesa access token...')
    console.log('🔑 Base URL:', baseUrl)
    console.log('🔑 Consumer Key:', consumerKey ? '***' + consumerKey.slice(-4) : 'MISSING')
    console.log('🔑 Consumer Secret:', consumerSecret ? '***' + consumerSecret.slice(-4) : 'MISSING')
    
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`
      }
    })

    console.log('🔑 Token response status:', tokenResponse.status)
    const tokenData = await tokenResponse.json()
    console.log('🔑 Token response data:', tokenData)
    
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
    
    // Use the encrypted SecurityCredential from the vault
    // This is the encrypted credential provided by Safaricom/Daraja

    const b2cRequest = {
      InitiatorName: partner.mpesa_initiator_name || 'testapi',
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: Math.round(params.amount),
      PartyA: shortCode,
      PartyB: params.msisdn,
      Remarks: params.remarks || params.tenant_id || 'B2C Disbursement',
      QueueTimeOutURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-timeout`,
      ResultURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-result`,
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

    // Check if M-Pesa returned an error in the response body
    if (b2cData.ResponseCode && b2cData.ResponseCode !== '0') {
      console.log('❌ M-Pesa API Error:', {
        ResponseCode: b2cData.ResponseCode,
        ResponseDescription: b2cData.ResponseDescription,
        ConversationID: b2cData.ConversationID,
        OriginatorConversationID: b2cData.OriginatorConversationID
      })
      throw new Error(`M-Pesa API Error: ${b2cData.ResponseCode} - ${b2cData.ResponseDescription}`)
    }

    console.log('✅ M-Pesa API Success:', {
      ResponseCode: b2cData.ResponseCode,
      ResponseDescription: b2cData.ResponseDescription,
      ConversationID: b2cData.ConversationID,
      OriginatorConversationID: b2cData.OriginatorConversationID
    })

    // Store disbursement request
    const { data: disbursement, error: disbursementError } = await supabaseClient
      .from('disbursement_requests')
      .insert({
        partner_id: params.partner_id,
        amount: params.amount,
        msisdn: params.msisdn,
        conversation_id: b2cData.ConversationID,
        originator_conversation_id: b2cData.OriginatorConversationID,
        status: 'queued',
        remarks: params.remarks || params.tenant_id,
        occasion: params.occasion,
        result_code: b2cData.ResponseCode,
        result_desc: b2cData.ResponseDescription,
        origin: 'ui', // Add the required origin field (must be 'ui' or 'ussd')
        customer_id: params.customer_id,
        client_request_id: params.client_request_id,
        tenant_id: params.tenant_id // Add the required tenant_id field
      })
      .select()
      .single()

    if (disbursementError) {
      console.log('❌ Error storing disbursement:', JSON.stringify(disbursementError, null, 2))
      throw new Error(`Failed to store disbursement request: ${JSON.stringify(disbursementError)}`)
    }

    console.log('✅ Disbursement request stored:', disbursement.id)

    const responseData = {
      success: true,
      disbursement: {
        id: disbursement.id,
        conversation_id: b2cData.ConversationID,
        originator_conversation_id: b2cData.OriginatorConversationID,
        status: 'queued',
        amount: params.amount,
        msisdn: params.msisdn,
        result_code: b2cData.ResponseCode,
        result_desc: b2cData.ResponseDescription
      }
    }

    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2))

    return new Response(
      JSON.stringify(responseData),
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
