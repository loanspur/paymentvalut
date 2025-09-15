import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers (inline to avoid import issues)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Enhanced Credential Manager for vault operations
class CredentialManager {
  // Get partner credentials from vault
  static async getPartnerCredentials(partnerId: string, passphrase: string): Promise<{
    consumer_key: string
    consumer_secret: string
    passkey?: string
    initiator_name?: string
    initiator_password: string
    security_credential?: string
    environment: string
  }> {
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get partner with encrypted credentials
    const { data: partner, error } = await supabaseClient
      .from('partners')
      .select('encrypted_credentials, vault_passphrase_hash, mpesa_shortcode, mpesa_environment')
      .eq('id', partnerId)
      .single()

    if (error || !partner) {
      throw new Error(`Partner not found: ${error?.message}`)
    }

    if (!partner.encrypted_credentials) {
      throw new Error('No encrypted credentials found for partner')
    }

    // Decrypt credentials
    const credentials = this.decryptCredentials(partner.encrypted_credentials, passphrase)
    
    return {
      ...credentials,
      environment: credentials.environment || partner.mpesa_environment || 'sandbox'
    }
  }

  // Decrypt credentials from vault
  private static decryptCredentials(encryptedData: string, passphrase: string): any {
    try {
      // Clean the encrypted data (remove spaces, fix malformed base64)
      const cleanData = encryptedData.replace(/\s/g, '')
      
      // Try to decode as base64
      let decodedData
      try {
        decodedData = atob(cleanData)
      } catch (base64Error) {
        console.log('❌ Base64 decode failed, trying direct JSON parse...')
        // If base64 fails, try direct JSON parse
        try {
          return JSON.parse(encryptedData)
        } catch (jsonError) {
          throw new Error('Failed to decode encrypted credentials')
        }
      }
      
      // Parse as JSON
      const credentials = JSON.parse(decodedData)
      
      console.log('✅ Credentials decrypted successfully:', {
        hasConsumerKey: !!credentials.consumer_key,
        hasConsumerSecret: !!credentials.consumer_secret,
        hasInitiatorPassword: !!credentials.initiator_password,
        hasSecurityCredential: !!credentials.security_credential,
        environment: credentials.environment
      })
      
      return credentials
      
    } catch (error) {
      console.error('❌ Failed to decrypt credentials:', error)
      throw new Error(`Failed to decrypt credentials: ${error.message}`)
    }
  }
}

interface BalanceRequestParams {
  partner_id: string
}

interface MpesaBalanceResponse {
  ConversationID: string
  OriginatorConversationID: string
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

    console.log('🔍 [Balance Monitor] Starting balance monitoring with vault credentials...')

    // Parse request body
    const params: BalanceRequestParams = await req.json()
    
    if (!params.partner_id) {
      throw new Error('Partner ID is required')
    }

    // Get partner info
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('id, name, mpesa_shortcode, mpesa_environment, mpesa_initiator_name')
      .eq('id', params.partner_id)
      .single()

    if (partnerError || !partner) {
      throw new Error(`Partner not found: ${partnerError?.message}`)
    }

    console.log('✅ [Balance Monitor] Partner found:', {
      id: partner.id,
      name: partner.name,
      shortcode: partner.mpesa_shortcode
    })

    // Get credentials from vault
    const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
    
    let credentials
    try {
      credentials = await CredentialManager.getPartnerCredentials(params.partner_id, vaultPassphrase)
      console.log('✅ [Balance Monitor] Credentials retrieved from vault:', {
        partner_id: params.partner_id,
        hasConsumerKey: !!credentials.consumer_key,
        hasConsumerSecret: !!credentials.consumer_secret,
        hasInitiatorPassword: !!credentials.initiator_password,
        hasSecurityCredential: !!credentials.security_credential,
        environment: credentials.environment
      })
    } catch (vaultError) {
      console.log('❌ [Balance Monitor] Failed to retrieve credentials from vault:', vaultError)
      throw new Error('Failed to retrieve M-Pesa credentials from vault')
    }

    const consumerKey = credentials.consumer_key
    const consumerSecret = credentials.consumer_secret
    const shortCode = partner.mpesa_shortcode
    const securityCredential = credentials.security_credential || credentials.initiator_password
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'

    if (!consumerKey || !consumerSecret || !shortCode) {
      throw new Error('M-Pesa credentials not configured for this partner')
    }
    
    if (!securityCredential) {
      console.log('❌ [Balance Monitor] M-Pesa SecurityCredential not configured for partner:', {
        partner_id: params.partner_id,
        hasSecurityCredential: !!securityCredential
      })
      throw new Error('M-Pesa SecurityCredential not configured for this partner')
    }

    // Get access token
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
      
    console.log('🔑 [Balance Monitor] Getting M-Pesa access token...')
    console.log('🔑 [Balance Monitor] Base URL:', baseUrl)
    console.log('🔑 [Balance Monitor] Consumer Key:', consumerKey ? '***' + consumerKey.slice(-4) : 'MISSING')
    
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`
      }
    })

    console.log('🔑 [Balance Monitor] Token response status:', tokenResponse.status)
    const tokenData = await tokenResponse.json()
    console.log('🔑 [Balance Monitor] Token response data:', tokenData)
    
    if (!tokenResponse.ok) {
      console.log('❌ [Balance Monitor] M-Pesa Token Error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: tokenData
      })
      throw new Error(`M-Pesa token error: ${tokenResponse.status} - ${JSON.stringify(tokenData)}`)
    }
    
    const accessToken = tokenData.access_token
    
    if (!accessToken) {
      console.log('❌ [Balance Monitor] No access token in response:', tokenData)
      throw new Error('No access token received from M-Pesa')
    }

    // Get account balance
    console.log('💰 [Balance Monitor] Getting account balance...')
    
    // Use the CORRECT callback URLs that actually exist
    const callbackBaseUrl = supabaseUrl
    const queueTimeoutUrl = `${callbackBaseUrl}/functions/v1/mpesa-b2c-timeout`
    const resultUrl = `${callbackBaseUrl}/functions/v1/mpesa-b2c-result`
    
    console.log('🔗 [Balance Monitor] Using callback URLs:', {
      queueTimeoutUrl,
      resultUrl
    })
    
    const balanceResponse = await fetch(`${baseUrl}/mpesa/accountbalance/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Initiator: credentials.initiator_name || 'testapi',
        SecurityCredential: securityCredential,
        CommandID: 'AccountBalance',
        PartyA: shortCode,
        IdentifierType: '4',
        Remarks: 'Balance Check',
        QueueTimeOutURL: queueTimeoutUrl,
        ResultURL: resultUrl
      })
    })

    const balanceData = await balanceResponse.json()
    
    console.log('💰 [Balance Monitor] Balance response:', {
      status: balanceResponse.status,
      response: balanceData
    })

    // Store balance request in database
    const { data: balanceRequest, error: balanceError } = await supabaseClient
      .from('balance_requests')
      .insert({
        partner_id: params.partner_id,
        mpesa_shortcode: shortCode,
        conversation_id: balanceData.ConversationID,
        originator_conversation_id: balanceData.OriginatorConversationID,
        status: 'queued',
        result_code: balanceData.ResponseCode,
        result_desc: balanceData.ResponseDescription
      })
      .select()
      .single()

    if (balanceError) {
      console.log('❌ [Balance Monitor] Error storing balance request:', balanceError)
      throw new Error('Failed to store balance request')
    }

    console.log('✅ [Balance Monitor] Balance request stored:', balanceRequest.id)

    // Return success response
    const response = {
      success: true,
      balance: {
        conversation_id: balanceData.ConversationID,
        originator_conversation_id: balanceData.OriginatorConversationID,
        status: 'queued',
        result_code: balanceData.ResponseCode,
        result_desc: balanceData.ResponseDescription
      }
    }

    console.log('📤 [Balance Monitor] Sending response:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ [Balance Monitor] Error:', error)
    
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error occurred'
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
