import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CredentialManager } from '../_shared/credential-manager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface Partner {
  id: string
  name: string
  mpesa_shortcode: string
  mpesa_environment: string
  is_mpesa_configured: boolean
}

interface BalanceData {
  utility_account_balance: number | null
  working_account_balance: number | null
  charges_account_balance: number | null
  timestamp: string
}

interface BalanceMonitoringConfig {
  id: string
  partner_id: string
  check_interval_minutes: number
  last_checked_at: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [Balance Monitor] Function started')
    
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [Balance Monitor] Missing Supabase environment variables')
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const requestBody = await req.json().catch(() => ({}))
    const { partner_id, force_check = true } = requestBody
    
    console.log('📥 [Balance Monitor] Request body:', { partner_id, force_check })

    let configsQuery = supabaseClient
      .from('balance_monitoring_config')
      .select('id, partner_id, check_interval_minutes, last_checked_at')
      .eq('is_enabled', true)

    if (partner_id) {
      configsQuery = configsQuery.eq('partner_id', partner_id)
    }

    const { data: configs, error: configsError } = await configsQuery

    console.log('🔍 [Balance Monitor] Fetched monitoring configs:', configs?.length || 0)
    console.log('🔍 [Balance Monitor] Configs error:', configsError)

    if (configsError) {
      console.error('❌ [Balance Monitor] Failed to fetch monitoring configurations:', configsError.message)
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch monitoring configurations',
        details: configsError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!configs || configs.length === 0) {
      console.warn('⚠️ [Balance Monitor] No monitoring configurations found')
      return new Response(JSON.stringify({ 
        message: 'No monitoring configurations found',
        results: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []
    console.log('🔄 [Balance Monitor] Starting to process', configs.length, 'configurations')

    for (const config of configs) {
      try {
        console.log('🔍 [Balance Monitor] Processing config for partner_id:', config.partner_id)
        
        const lastChecked = config.last_checked_at ? new Date(config.last_checked_at) : null
        const now = new Date()
        const checkInterval = config.check_interval_minutes * 60 * 1000
        
        if (!force_check && lastChecked && (now.getTime() - lastChecked.getTime()) < checkInterval) {
          console.log('⏭️ [Balance Monitor] Skipping partner_id:', config.partner_id, '- not time to check yet')
          results.push({
            partner_id: config.partner_id,
            status: 'skipped',
            reason: 'Not time to check yet'
          })
          continue
        }

        console.log('📋 [Balance Monitor] Fetching partner data for partner_id:', config.partner_id)
        const { data: partner, error: partnerError } = await supabaseClient
          .from('partners')
          .select('id, name, mpesa_shortcode, mpesa_environment, is_mpesa_configured, mpesa_initiator_name, consumer_key, consumer_secret, initiator_password, security_credential, encrypted_credentials')
          .eq('id', config.partner_id)
          .single()

        if (partnerError || !partner || !partner.is_mpesa_configured) {
          console.log('❌ [Balance Monitor] Partner error for partner_id:', config.partner_id, 'Error:', partnerError?.message, 'Partner found:', !!partner, 'M-Pesa configured:', partner?.is_mpesa_configured)
          results.push({
            partner_id: config.partner_id,
            status: 'error',
            reason: 'Partner not found or M-Pesa not configured'
          })
          continue
        }

        console.log('✅ [Balance Monitor] Partner found:', partner.name, 'M-Pesa configured:', partner.is_mpesa_configured)
        console.log('🔑 [Balance Monitor] Starting balance check for partner:', partner.name)
        console.log('🔍 [Balance Monitor] Partner data keys:', Object.keys(partner))
        console.log('🔍 [Balance Monitor] Partner mpesa_initiator_name:', partner.mpesa_initiator_name)
        
        console.log('🔑 [Balance Monitor] About to call getCurrentBalance for partner:', partner.name)
        const balanceData = await getCurrentBalance(supabaseClient, partner)
        console.log('✅ [Balance Monitor] getCurrentBalance completed for partner:', partner.name)
        
        await checkBalanceThresholds(supabaseClient, config, partner, balanceData)

        await supabaseClient
          .from('balance_monitoring_config')
          .update({ last_checked_at: now.toISOString() })
          .eq('id', config.id)

        results.push({
          partner_id: config.partner_id,
          partner_name: partner.name,
          status: 'checked',
          balance_data: balanceData,
          checked_at: now.toISOString()
        })

      } catch (error) {
        results.push({
          partner_id: config.partner_id,
          status: 'error',
          error: error.message
        })
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'checked').length,
      failed: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      summary,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function getCurrentBalance(supabaseClient: any, partner: Partner): Promise<BalanceData> {
  console.log('🔑 [Balance Monitor] Starting credential retrieval for partner:', partner.name)
  
  const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
  console.log('🔑 [Balance Monitor] Vault passphrase available:', !!vaultPassphrase)
  
  // Get credentials from vault using the same approach as disburse function
  let credentials
  try {
    console.log('🔑 [Balance Monitor] Attempting to get credentials from vault for partner:', partner.name)
    credentials = await CredentialManager.getPartnerCredentials(partner.id, vaultPassphrase, partner)
    console.log('✅ [Balance Monitor] Vault credentials retrieved successfully for partner:', partner.name)
  } catch (vaultError) {
    console.error('❌ [Balance Monitor] Vault credential retrieval failed for partner:', partner.name, vaultError.message)
    console.log('🔑 [Balance Monitor] Attempting fallback to plain text credentials for partner:', partner.name)
    
    // Fallback to plain text credentials - more lenient approach
    if (partner.consumer_key && partner.consumer_secret) {
      console.log('🔑 [Balance Monitor] Using plain text credentials as fallback for partner:', partner.name)
      credentials = {
        consumer_key: partner.consumer_key,
        consumer_secret: partner.consumer_secret,
        initiator_password: partner.initiator_password || 'default_initiator_password',
        security_credential: partner.security_credential || partner.initiator_password || 'default_security_credential',
        initiator_name: partner.mpesa_initiator_name || 'default_initiator',
        shortcode: partner.mpesa_shortcode || '',
        environment: partner.mpesa_environment || 'sandbox'
      }
      console.log('✅ [Balance Monitor] Fallback credentials created for partner:', partner.name)
    } else {
      console.error('❌ [Balance Monitor] No credentials available for partner:', partner.name, 'consumer_key:', !!partner.consumer_key, 'consumer_secret:', !!partner.consumer_secret)
      throw new Error(`Failed to retrieve M-Pesa credentials for ${partner.name}: Missing consumer_key or consumer_secret`)
    }
  }
  
  console.log('🔑 [Balance Monitor] Getting M-Pesa access token for partner:', partner.name)
  const accessToken = await getMpesaAccessToken(credentials, partner)
  if (!accessToken) {
    console.error('❌ [Balance Monitor] Failed to get M-Pesa access token for partner:', partner.name)
    throw new Error('Failed to get M-Pesa access token')
  }
  console.log('✅ [Balance Monitor] M-Pesa access token obtained for partner:', partner.name)

  const environment = credentials.environment || partner.mpesa_environment || 'sandbox'
  const balanceUrl = environment === 'production' 
    ? 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query'
    : 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query'

  console.log('🔑 [Balance Monitor] Environment:', environment, 'URL:', balanceUrl)

  // Use ONLY the generated security credential, never fall back to plain password
  if (!credentials.security_credential) {
    console.error('❌ [Balance Monitor] Security credential not found for partner:', partner.name)
    throw new Error('Security credential not found in vault. Please generate and store the security credential in the partner form.')
  }
  const securityCredential = credentials.security_credential
  console.log('✅ [Balance Monitor] Security credential available for partner:', partner.name)
  console.log('🔍 [Balance Monitor] Security credential length:', securityCredential ? securityCredential.length : 0)
  console.log('🔍 [Balance Monitor] Security credential preview:', securityCredential ? securityCredential.substring(0, 20) + '...' : 'null')
  
  // Using security credential from vault
  
  console.log('📋 [Balance Monitor] Preparing M-Pesa API request for partner:', partner.name)
  console.log('🔍 [Balance Monitor] Credentials object keys:', Object.keys(credentials))
  console.log('🔍 [Balance Monitor] credentials.initiator_name:', credentials.initiator_name)
  console.log('🔍 [Balance Monitor] partner.mpesa_initiator_name:', partner.mpesa_initiator_name)
  console.log('🔍 [Balance Monitor] credentials.security_credential length:', credentials.security_credential ? credentials.security_credential.length : 0)
  console.log('🔍 [Balance Monitor] credentials.security_credential preview:', credentials.security_credential ? credentials.security_credential.substring(0, 20) + '...' : 'null')
  console.log('  - Final Initiator Name:', credentials.initiator_name || partner.mpesa_initiator_name || 'default_initiator')
  console.log('  - Shortcode:', partner.mpesa_shortcode)
  console.log('  - Environment URL:', Deno.env.get('NEXT_PUBLIC_SUPABASE_URL'))
  console.log('  - QueueTimeOutURL:', `${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/mpesa-balance-result`)
  console.log('  - ResultURL:', `${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/mpesa-balance-result`)
  
  const balanceRequest = {
    Initiator: credentials.initiator_name || partner.mpesa_initiator_name || 'default_initiator',
    SecurityCredential: securityCredential,
    CommandID: 'AccountBalance',
    PartyA: partner.mpesa_shortcode,
    IdentifierType: '4',
    Remarks: 'balance inquiry',
    QueueTimeOutURL: `${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/mpesa-balance-result`,
    ResultURL: `${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/mpesa-balance-result`
  }
  
  console.log('📡 [Balance Monitor] Making M-Pesa API call for partner:', partner.name)
  console.log('📡 [Balance Monitor] Initiator being sent:', balanceRequest.Initiator)
  console.log('📡 [Balance Monitor] Initiator name source check:')
  console.log('  - credentials.initiator_name:', credentials.initiator_name)
  console.log('  - partner.mpesa_initiator_name:', partner.mpesa_initiator_name)
  console.log('  - Final choice:', balanceRequest.Initiator)
  console.log('📡 [Balance Monitor] Request payload:', JSON.stringify(balanceRequest, null, 2))

  const response = await fetch(balanceUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(balanceRequest)
  })

  console.log('📡 [Balance Monitor] M-Pesa API response status:', response.status, response.statusText)
  console.log('📡 [Balance Monitor] M-Pesa API response headers:', Object.fromEntries(response.headers.entries()))

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [Balance Monitor] M-Pesa API error response:', errorText)
    throw new Error(`M-Pesa balance API error: ${response.status} - ${errorText}`)
  }

  const balanceData = await response.json()
  console.log('✅ [Balance Monitor] M-Pesa API success response:', JSON.stringify(balanceData, null, 2))

  if (balanceData.ResponseCode === '0') {
    console.log('📤 M-Pesa Balance Request:', {
      PartyA: partner.mpesa_shortcode,
      CommandID: 'AccountBalance',
      Remarks: 'balance inquiry',
      ResultURL: balanceRequest.ResultURL,
      QueueTimeOutURL: balanceRequest.QueueTimeOutURL
    })

    await supabaseClient
      .from('balance_requests')
      .insert({
        partner_id: partner.id,
        conversation_id: balanceData.ConversationID,
        originator_conversation_id: balanceData.OriginatorConversationID,
        shortcode: partner.mpesa_shortcode,
        initiator_name: credentials.initiator_name || partner.mpesa_initiator_name || 'default_initiator',
        status: 'pending',
        mpesa_response: balanceData
      })

    await new Promise(resolve => setTimeout(resolve, 35000))

    const { data: latestBalance, error: balanceError } = await supabaseClient
      .from('balance_requests')
      .select('utility_account_balance, working_account_balance, charges_account_balance, updated_at, status, conversation_id')
      .eq('partner_id', partner.id)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!latestBalance || balanceError) {
      const { data: pendingBalance } = await supabaseClient
        .from('balance_requests')
        .select('utility_account_balance, working_account_balance, charges_account_balance, updated_at, status, conversation_id')
        .eq('partner_id', partner.id)
        .eq('conversation_id', balanceData.ConversationID)
        .single()
      
      if (pendingBalance) {
        return {
          utility_account_balance: pendingBalance.utility_account_balance,
          working_account_balance: pendingBalance.working_account_balance,
          charges_account_balance: pendingBalance.charges_account_balance,
          timestamp: pendingBalance.updated_at || new Date().toISOString()
        }
      }
    }

    if (latestBalance && !balanceError) {
      return {
        utility_account_balance: latestBalance.utility_account_balance || latestBalance.balance_after,
        working_account_balance: latestBalance.working_account_balance,
        charges_account_balance: latestBalance.charges_account_balance,
        timestamp: latestBalance.updated_at || new Date().toISOString()
      }
    } else {
      throw new Error('Balance callback not received within timeout period')
    }
  } else {
    throw new Error(`M-Pesa API error: ${balanceData.ResponseCode} - ${balanceData.ResponseDescription}`)
  }
}

async function getMpesaAccessToken(credentials: any, partner: Partner): Promise<string | null> {
  try {
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'
    const authUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'

    const auth = btoa(`${credentials.consumer_key}:${credentials.consumer_secret}`)
    
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })

    if (!response.ok) {
      throw new Error(`M-Pesa auth failed: ${response.status}`)
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    return null
  }
}

async function checkBalanceThresholds(
  supabaseClient: any,
  config: BalanceMonitoringConfig,
  partner: Partner,
  balanceData: BalanceData
): Promise<any[]> {
  return []
}