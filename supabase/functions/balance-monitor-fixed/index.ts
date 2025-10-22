import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CredentialManager } from '../_shared/credential-manager.ts'

// CORS headers
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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const requestBody = await req.json().catch(() => ({}))
    const { partner_id, force_check = true } = requestBody

    console.log('🔄 [Balance Monitor] Starting balance check process', {
      partner_id,
      force_check,
      timestamp: new Date().toISOString()
    })

    // Get monitoring configurations
    let configsQuery = supabaseClient
      .from('balance_monitoring_config')
      .select('id, partner_id, check_interval_minutes, last_checked_at')
      .eq('is_enabled', true)

    if (partner_id) {
      configsQuery = configsQuery.eq('partner_id', partner_id)
    }

    const { data: configs, error: configsError } = await configsQuery

    if (configsError) {
      console.error('❌ [Balance Monitor] Error fetching configs:', configsError)
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch monitoring configurations',
        details: configsError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No monitoring configurations found',
        results: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    for (const config of configs) {
      try {
        // ✅ FIXED: Only skip if NOT force_check AND within interval
        const lastChecked = config.last_checked_at ? new Date(config.last_checked_at) : null
        const now = new Date()
        const checkInterval = config.check_interval_minutes * 60 * 1000 // Convert to milliseconds
        
        if (!force_check && lastChecked && (now.getTime() - lastChecked.getTime()) < checkInterval) {
          results.push({
            partner_id: config.partner_id,
            status: 'skipped',
            reason: 'Not time to check yet',
            next_check_in_minutes: Math.ceil((checkInterval - (now.getTime() - lastChecked.getTime())) / (1000 * 60))
          })
          continue
        }

        // Get partner details
        const { data: partner, error: partnerError } = await supabaseClient
          .from('partners')
          .select('id, name, mpesa_shortcode, mpesa_environment, is_mpesa_configured')
          .eq('id', config.partner_id)
          .single()

        if (partnerError || !partner || !partner.is_mpesa_configured) {
          results.push({
            partner_id: config.partner_id,
            status: 'error',
            reason: 'Partner not found or M-Pesa not configured'
          })
          continue
        }

        console.log(`🔄 [Balance Monitor] Checking balance for partner: ${partner.name}`)

        // ✅ FIXED: Always try fresh M-Pesa API call first
        let balanceData
        let usedFreshData = false
        try {
          balanceData = await getCurrentBalance(supabaseClient, partner)
          usedFreshData = true
          console.log(`✅ [Balance Monitor] Fresh balance data retrieved for ${partner.name}`)
        } catch (apiError) {
          console.warn(`⚠️ [Balance Monitor] API call failed for ${partner.name}, using database fallback:`, apiError.message)
          // Fallback to database data if API fails
          balanceData = await getCurrentBalanceFromDatabase(supabaseClient, partner)
          usedFreshData = false
        }
        
        // Check thresholds and send alerts if needed
        const alerts = await checkBalanceThresholds(
          supabaseClient,
          config,
          partner,
          balanceData
        )

        // Update last checked time
        await supabaseClient
          .from('balance_monitoring_config')
          .update({ last_checked_at: now.toISOString() })
          .eq('id', config.id)

        results.push({
          partner_id: config.partner_id,
          partner_name: partner.name,
          status: 'checked',
          used_fresh_data: usedFreshData,
          balance_data: balanceData,
          alerts_triggered: alerts.length,
          checked_at: now.toISOString()
        })

      } catch (error) {
        console.error(`❌ [Balance Monitor] Error processing partner ${config.partner_id}:`, error)
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

    console.log('✅ [Balance Monitor] Balance check completed:', summary)

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
    console.error('❌ [Balance Monitor] Fatal error:', error)
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

async function getCurrentBalanceFromDatabase(supabaseClient: any, partner: Partner): Promise<BalanceData> {
  try {
    // ✅ FIXED: Single source of truth - only use balance_requests table
    const { data: balanceRequest, error: balanceError } = await supabaseClient
      .from('balance_requests')
      .select('utility_account_balance, working_account_balance, charges_account_balance, created_at, updated_at')
      .eq('partner_id', partner.id)
      .eq('status', 'completed')
      .not('utility_account_balance', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (balanceRequest && !balanceError) {
      return {
        utility_account_balance: balanceRequest.utility_account_balance,
        working_account_balance: balanceRequest.working_account_balance,
        charges_account_balance: balanceRequest.charges_account_balance,
        timestamp: balanceRequest.updated_at || balanceRequest.created_at
      }
    }

    // If no balance data found, return null values
    return {
      utility_account_balance: null,
      working_account_balance: null,
      charges_account_balance: null,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error(`❌ [Balance Monitor] Database fallback error for ${partner.name}:`, error)
    return {
      utility_account_balance: null,
      working_account_balance: null,
      charges_account_balance: null,
      timestamp: new Date().toISOString()
    }
  }
}

async function getCurrentBalance(supabaseClient: any, partner: Partner): Promise<BalanceData> {
  try {
    // ✅ FIXED: Use shared vault credentials instead of individual partner credentials
    const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
    
    // ✅ FIXED: Use shared credentials for all partners
    let credentials
    try {
      // Try to get shared credentials first
      credentials = await getSharedCredentials(vaultPassphrase)
    } catch (sharedError) {
      console.warn('⚠️ [Balance Monitor] Shared credentials not available, trying partner-specific:', sharedError.message)
      // Fallback to partner-specific credentials
      credentials = await CredentialManager.getPartnerCredentials(partner.id, vaultPassphrase)
    }
    
    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken(credentials, partner)
    if (!accessToken) {
      throw new Error('Failed to get M-Pesa access token')
    }

    // Call M-Pesa account balance API
    const environment = credentials.environment || partner.mpesa_environment || 'sandbox'
    const balanceUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query'
      : 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query'

    const balanceRequest = {
      Initiator: credentials.initiator_name || process.env.DEFAULT_INITIATOR_NAME || 'default_initiator',
      SecurityCredential: credentials.security_credential,
      CommandID: 'AccountBalance',
      PartyA: partner.mpesa_shortcode,
      IdentifierType: '4',
      Remarks: 'balance inquiry',
      QueueTimeOutURL: `${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/mpesa-balance-result`,
      ResultURL: `${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/mpesa-balance-result`
    }

    console.log(`🔄 [Balance Monitor] Making M-Pesa API call for ${partner.name}`)

    const response = await fetch(balanceUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(balanceRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`M-Pesa balance API error: ${response.status} - ${errorText}`)
    }

    const balanceData = await response.json()

    // Parse the balance response (this is an asynchronous response for account balance)
    if (balanceData.ResponseCode === '0') {
      // Store the balance request in the database
      const { error: insertError } = await supabaseClient
        .from('balance_requests')
        .insert({
          partner_id: partner.id,
          conversation_id: balanceData.ConversationID,
          originator_conversation_id: balanceData.OriginatorConversationID,
          shortcode: partner.mpesa_shortcode,
          initiator_name: credentials.initiator_name || process.env.DEFAULT_INITIATOR_NAME || 'default_initiator',
          status: 'pending',
          mpesa_response: balanceData
        })

      if (insertError) {
        console.error('❌ [Balance Monitor] Error storing balance request:', insertError)
      }

      // ✅ FIXED: Wait longer for the callback to arrive (M-Pesa can take 30+ seconds)
      console.log(`⏳ [Balance Monitor] Waiting for M-Pesa callback for ${partner.name}...`)
      await new Promise(resolve => setTimeout(resolve, 35000)) // Increased to 35 seconds

      // Try to get the latest balance from the database (from callback)
      let { data: latestBalance, error: balanceError } = await supabaseClient
        .from('balance_requests')
        .select('utility_account_balance, working_account_balance, charges_account_balance, updated_at, status, conversation_id')
        .eq('partner_id', partner.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      // If no completed balance found, try to find the pending request we just created
      if (!latestBalance || balanceError) {
        const { data: pendingBalance } = await supabaseClient
          .from('balance_requests')
          .select('utility_account_balance, working_account_balance, charges_account_balance, updated_at, status, conversation_id')
          .eq('partner_id', partner.id)
          .eq('conversation_id', balanceData.ConversationID)
          .single()
        
        if (pendingBalance) {
          latestBalance = pendingBalance
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

  } catch (error) {
    console.error(`❌ [Balance Monitor] Error getting balance for ${partner.name}:`, error)
    throw error
  }
}

// ✅ NEW: Function to get shared credentials for all partners
async function getSharedCredentials(passphrase: string): Promise<any> {
  // Try to get shared credentials from environment or a special partner record
  const sharedCredentials = {
    consumer_key: Deno.env.get('SHARED_MPESA_CONSUMER_KEY'),
    consumer_secret: Deno.env.get('SHARED_MPESA_CONSUMER_SECRET'),
    initiator_password: Deno.env.get('SHARED_MPESA_INITIATOR_PASSWORD'),
    security_credential: Deno.env.get('SHARED_MPESA_SECURITY_CREDENTIAL'),
    initiator_name: Deno.env.get('SHARED_MPESA_INITIATOR_NAME') || 'shared_initiator',
    environment: Deno.env.get('SHARED_MPESA_ENVIRONMENT') || 'sandbox'
  }

  // Validate that all required credentials are present
  if (!sharedCredentials.consumer_key || !sharedCredentials.consumer_secret || 
      !sharedCredentials.initiator_password || !sharedCredentials.security_credential) {
    throw new Error('Shared M-Pesa credentials not configured in environment variables')
  }

  return sharedCredentials
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
    console.error('❌ [Balance Monitor] OAuth error:', error)
    return null
  }
}

async function checkBalanceThresholds(
  supabaseClient: any,
  config: BalanceMonitoringConfig,
  partner: Partner,
  balanceData: BalanceData
): Promise<any[]> {
  // Implementation for balance threshold checking
  // This would check if balances are below thresholds and send alerts
  return []
}

