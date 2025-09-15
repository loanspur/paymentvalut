import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Credential Manager - Updated version with improved decryption
interface DecryptedCredentials {
  consumer_key: string
  consumer_secret: string
  passkey?: string
  initiator_name?: string
  initiator_password: string
  security_credential?: string
  environment: string
  migrated_at?: string
}

class CredentialManager {
  // Improved decryption function that handles different vault formats
  static async decryptCredentials(encryptedData: string, passphrase: string): Promise<DecryptedCredentials> {
    try {
      console.log('🔓 [Balance Monitor] Attempting to decrypt credentials...')
      console.log('🔓 [Balance Monitor] Data type:', typeof encryptedData)
      console.log('🔓 [Balance Monitor] Data length:', encryptedData?.length)
      console.log('🔓 [Balance Monitor] Data preview:', encryptedData?.substring(0, 100))
      
      // Try to parse as JSON first (if it's already decrypted)
      if (encryptedData.startsWith('{')) {
        console.log('🔓 [Balance Monitor] Parsing as JSON...')
        const credentials = JSON.parse(encryptedData)
        console.log('✅ [Balance Monitor] Successfully parsed as JSON')
        return credentials
      }
      
      // Clean the data by removing spaces and invalid characters
      const cleanedData = encryptedData.replace(/[\s\n\r]/g, '')
      console.log('🔓 [Balance Monitor] Cleaned data length:', cleanedData.length)
      console.log('🔓 [Balance Monitor] Cleaned data preview:', cleanedData.substring(0, 100))
      
      // Try base64 decoding with cleaned data
      try {
        console.log('🔓 [Balance Monitor] Attempting base64 decode with cleaned data...')
        const decoded = atob(cleanedData)
        console.log('🔓 [Balance Monitor] Decoded length:', decoded.length)
        console.log('🔓 [Balance Monitor] Decoded preview:', decoded.substring(0, 100))
        
        const credentials = JSON.parse(decoded)
        console.log('✅ [Balance Monitor] Successfully decoded and parsed')
        return credentials
      } catch (base64Error) {
        console.log('❌ [Balance Monitor] Base64 decode failed:', base64Error.message)
      }
      
      // Try original data (in case cleaning broke it)
      try {
        console.log('🔓 [Balance Monitor] Attempting base64 decode with original data...')
        const decoded = atob(encryptedData)
        console.log('🔓 [Balance Monitor] Decoded length:', decoded.length)
        console.log('🔓 [Balance Monitor] Decoded preview:', decoded.substring(0, 100))
        
        const credentials = JSON.parse(decoded)
        console.log('✅ [Balance Monitor] Successfully decoded and parsed')
        return credentials
      } catch (base64Error2) {
        console.log('❌ [Balance Monitor] Base64 decode with original data failed:', base64Error2.message)
      }
      
      // If all else fails, try to parse as raw JSON
      console.log('🔓 [Balance Monitor] Attempting direct JSON parse...')
      const credentials = JSON.parse(encryptedData)
      console.log('✅ [Balance Monitor] Successfully parsed directly')
      return credentials
      
    } catch (error) {
      console.log('❌ [Balance Monitor] All decryption attempts failed:', error.message)
      throw new Error(`Failed to decrypt credentials: ${error.message}`)
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

    console.log('🔍 [Balance Monitor] Retrieved encrypted credentials from database')
    console.log('🔍 [Balance Monitor] Credential type:', typeof partner.encrypted_credentials)
    console.log('🔍 [Balance Monitor] Credential length:', partner.encrypted_credentials.length)

    // Decrypt credentials
    return await this.decryptCredentials(partner.encrypted_credentials, passphrase)
  }
}

interface BalanceResponse {
  WorkingAccountBalance: string
  UtilityAccountBalance: string
  ChargesPaidAccountBalance: string
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
    const { partner_id } = await req.json()
    
    if (!partner_id) {
      throw new Error('Missing required parameter: partner_id')
    }

    console.log('💰 [Balance Monitor] Starting balance check with vault credentials:', {
      partner_id
    })

    // Get partner basic info (without credentials)
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('id, name, mpesa_shortcode, mpesa_environment, is_mpesa_configured')
      .eq('id', partner_id)
      .single()

    if (partnerError || !partner || !partner.is_mpesa_configured) {
      console.log('❌ [Balance Monitor] Partner M-Pesa credentials not configured:', {
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
      credentials = await CredentialManager.getPartnerCredentials(partner_id, vaultPassphrase)
      console.log('✅ [Balance Monitor] Credentials retrieved from vault:', {
        partner_id,
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
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'

    if (!consumerKey || !consumerSecret || !shortCode) {
      throw new Error('M-Pesa credentials not configured for this partner')
    }
    
    console.log('✅ [Balance Monitor] M-Pesa credentials loaded from vault:', {
      partner_id,
      shortCode,
      environment,
      hasSecurityCredential: !!credentials.security_credential,
      hasInitiatorPassword: !!credentials.initiator_password
    })

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
    
    const balanceResponse = await fetch(`${baseUrl}/mpesa/accountbalance/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Initiator: credentials.initiator_name || 'testapi',
        SecurityCredential: credentials.security_credential || credentials.initiator_password,
        CommandID: 'AccountBalance',
        PartyA: shortCode,
        IdentifierType: '4',
        Remarks: 'Balance Check',
        QueueTimeOutURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-timeout`,
        ResultURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-result`
      })
    })

    const balanceData = await balanceResponse.json()
    
    console.log('💰 [Balance Monitor] Balance response:', {
      status: balanceResponse.status,
      response: balanceData
    })

    if (!balanceResponse.ok) {
      throw new Error(`Balance request failed: ${balanceResponse.status} - ${JSON.stringify(balanceData)}`)
    }

    // Check if M-Pesa returned an error in the response body
    if (balanceData.ResponseCode && balanceData.ResponseCode !== '0') {
      console.log('❌ [Balance Monitor] M-Pesa API Error:', {
        ResponseCode: balanceData.ResponseCode,
        ResponseDescription: balanceData.ResponseDescription,
        ConversationID: balanceData.ConversationID,
        OriginatorConversationID: balanceData.OriginatorConversationID
      })
      throw new Error(`M-Pesa API Error: ${balanceData.ResponseCode} - ${balanceData.ResponseDescription}`)
    }

    console.log('✅ [Balance Monitor] Balance check successful:', {
      ResponseCode: balanceData.ResponseCode,
      ResponseDescription: balanceData.ResponseDescription,
      ConversationID: balanceData.ConversationID,
      OriginatorConversationID: balanceData.OriginatorConversationID
    })

    // Store balance check request
    const { data: balanceRequest, error: balanceError } = await supabaseClient
      .from('balance_requests')
      .insert({
        partner_id: partner_id,
        conversation_id: balanceData.ConversationID,
        originator_conversation_id: balanceData.OriginatorConversationID,
        status: 'queued',
        result_code: balanceData.ResponseCode,
        result_desc: balanceData.ResponseDescription,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (balanceError) {
      console.log('❌ [Balance Monitor] Error storing balance request:', JSON.stringify(balanceError, null, 2))
      // Don't throw error here, balance check was successful
    } else {
      console.log('✅ [Balance Monitor] Balance request stored:', balanceRequest.id)
    }

    const responseData = {
      success: true,
      balance: {
        conversation_id: balanceData.ConversationID,
        originator_conversation_id: balanceData.OriginatorConversationID,
        status: 'queued',
        result_code: balanceData.ResponseCode,
        result_desc: balanceData.ResponseDescription
      }
    }

    console.log('📤 [Balance Monitor] Sending response:', JSON.stringify(responseData, null, 2))

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ [Balance Monitor] Balance check error:', error)
    
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
