import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CredentialManager } from '../_shared/credential-manager.ts'

// CORS headers for Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}


interface BalanceMonitoringConfig {
  id: string
  partner_id: string
  utility_account_threshold: number
  check_interval_minutes: number
  slack_webhook_url: string | null
  slack_channel: string | null
  is_enabled: boolean
  last_checked_at: string | null
  last_alert_sent_at: string | null
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
}

interface MpesaBalanceResponse {
  utility_account_balance: number
  currency: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body to check for force_check parameter
    let requestBody = {}
    try {
      requestBody = await req.json()
    } catch (e) {
      // No body or invalid JSON, continue with empty object
    }

    const { partner_id, force_check = false } = requestBody

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get monitoring configurations
    // If partner_id is provided, get config for that specific partner
    // Otherwise get all enabled configurations
    let query = supabaseClient
      .from('balance_monitoring_config')
      .select('*')
      .eq('is_enabled', true)

    if (partner_id) {
      query = query.eq('partner_id', partner_id)
    }

    let { data: configs, error: configError } = await query

    // If table doesn't exist, try partner_balance_configs
    if (configError && configError.code === 'PGRST205') {
      let fallbackQuery = supabaseClient
        .from('partner_balance_configs')
        .select('*')
        .eq('is_monitoring_enabled', true)
      
      if (partner_id) {
        fallbackQuery = fallbackQuery.eq('partner_id', partner_id)
      }
      
      const result = await fallbackQuery
      configs = result.data
      configError = result.error
    }

    if (configError) {
      throw new Error(`Failed to fetch monitoring configs: ${configError.message}`)
    }

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: 'No monitoring configurations found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    for (const config of configs) {
      try {
        // Check if it's time to check this partner's balance (unless force_check is true)
        const lastChecked = config.last_checked_at ? new Date(config.last_checked_at) : null
        const now = new Date()
        const checkInterval = config.check_interval_minutes * 60 * 1000 // Convert to milliseconds
        
        if (!force_check && lastChecked && (now.getTime() - lastChecked.getTime()) < checkInterval) {
          results.push({
            partner_id: config.partner_id,
            status: 'skipped',
            reason: 'Not time to check yet'
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

        // Get current balance - try fresh M-Pesa API call first, fallback to database
        let balanceData
        let usedFreshData = false
        try {
          // First try to get fresh balance from M-Pesa API
          try {
            balanceData = await getCurrentBalance(supabaseClient, partner)
            usedFreshData = true
          } catch (apiError) {
            // Fallback to database data if API fails
            balanceData = await getCurrentBalanceFromDatabase(supabaseClient, partner)
            usedFreshData = false
          }
        } catch (balanceError) {
          results.push({
            partner_id: config.partner_id,
            partner_name: partner.name,
            status: 'error',
            error: balanceError.message
          })
          continue
        }
        
        // Check thresholds and send alerts if needed
        const alerts = await checkBalanceThresholds(
          supabaseClient,
          config,
          partner,
          balanceData
        )

        // Update last checked time
        // Try balance_monitoring_config first, fallback to partner_balance_configs
        let updateError = await supabaseClient
          .from('balance_monitoring_config')
          .update({ last_checked_at: now.toISOString() })
          .eq('id', config.id)

        // If table doesn't exist, try partner_balance_configs
        if (updateError && updateError.code === 'PGRST205') {
          await supabaseClient
            .from('partner_balance_configs')
            .update({ updated_at: now.toISOString() })
            .eq('id', config.id)
        }

        
        results.push({
          partner_id: config.partner_id,
          partner_name: partner.name,
          status: 'checked',
          balance_data: {
            utility_account_balance: balanceData.utility_account_balance
          },
          alerts_sent: alerts.length,
          alerts: alerts,
          used_fresh_data: usedFreshData,
          balance_amount: balanceData.utility_account_balance
        })

      } catch (error) {
        results.push({
          partner_id: config.partner_id,
          status: 'error',
          reason: error.message
        })
      }
    }

    return new Response(JSON.stringify({
      message: 'Balance monitoring completed',
      timestamp: new Date().toISOString(),
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Balance monitoring failed',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function getCurrentBalanceFromDatabase(supabaseClient: any, partner: Partner): Promise<BalanceData> {
  try {
    // First, try to get the most recent balance data from balance_requests table
    const { data: balanceRequest, error: balanceError } = await supabaseClient
      .from('balance_requests')
      .select('utility_account_balance, working_account_balance, charges_account_balance, created_at, updated_at')
      .eq('partner_id', partner.id)
      .eq('status', 'completed')
      .not('utility_account_balance', 'is', null)
      .order('created_at', { ascending: false })
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

    // Fallback: Get the most recent transaction balance data from disbursement_requests table
    const { data: latestTransaction, error: transactionError } = await supabaseClient
      .from('disbursement_requests')
      .select(`
        utility_balance_at_transaction,
        working_balance_at_transaction,
        charges_balance_at_transaction,
        mpesa_utility_account_balance,
        mpesa_working_account_balance,
        mpesa_charges_account_balance,
        balance_updated_at,
        updated_at,
        created_at
      `)
      .eq('partner_id', partner.id)
      .not('utility_balance_at_transaction', 'is', null)
      .order('balance_updated_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (latestTransaction && !transactionError) {
      // Use the most recent balance data available
      const utilityBalance = latestTransaction.utility_balance_at_transaction || 
                           latestTransaction.mpesa_utility_account_balance
      const workingBalance = latestTransaction.working_balance_at_transaction || 
                           latestTransaction.mpesa_working_account_balance
      const chargesBalance = latestTransaction.charges_balance_at_transaction || 
                           latestTransaction.mpesa_charges_account_balance
      
      const timestamp = latestTransaction.balance_updated_at || 
                       latestTransaction.updated_at || 
                       latestTransaction.created_at

      return {
        utility_account_balance: utilityBalance,
        working_account_balance: workingBalance,
        charges_account_balance: chargesBalance,
        timestamp: timestamp
      }
    }

    // If still no data, try any transaction with balance data
    const { data: anyTransaction, error: anyError } = await supabaseClient
      .from('disbursement_requests')
      .select(`
        utility_balance_at_transaction,
        working_balance_at_transaction,
        charges_balance_at_transaction,
        mpesa_utility_account_balance,
        mpesa_working_account_balance,
        mpesa_charges_account_balance,
        updated_at,
        created_at
      `)
      .eq('partner_id', partner.id)
      .or('utility_balance_at_transaction.not.is.null,mpesa_utility_account_balance.not.is.null')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (anyTransaction && !anyError) {
      const utilityBalance = anyTransaction.utility_balance_at_transaction || 
                           anyTransaction.mpesa_utility_account_balance
      const workingBalance = anyTransaction.working_balance_at_transaction || 
                           anyTransaction.mpesa_working_account_balance
      const chargesBalance = anyTransaction.charges_balance_at_transaction || 
                           anyTransaction.mpesa_charges_account_balance

      return {
        utility_account_balance: utilityBalance,
        working_account_balance: workingBalance,
        charges_account_balance: chargesBalance,
        timestamp: anyTransaction.updated_at || anyTransaction.created_at
      }
    }

    throw new Error(`No balance data found for partner ${partner.name} in any table`)
  } catch (error) {
    throw new Error(`Failed to get balance data from database: ${error.message}`)
  }
}

async function getCurrentBalance(supabaseClient: any, partner: Partner): Promise<BalanceData> {
  try {
    
    // Get credentials from vault
    const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
    
    let credentials
    try {
      credentials = await CredentialManager.getPartnerCredentials(partner.id, vaultPassphrase)
    } catch (vaultError) {
      throw new Error(`Failed to retrieve M-Pesa credentials for ${partner.name}: ${vaultError.message}`)
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
      Remarks: 'Balance inquiry',
      QueueTimeOutURL: 'https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-balance-result',
      ResultURL: 'https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-balance-result'
    }

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

      // Wait longer for the callback to arrive (M-Pesa can take 5-30 seconds)
      await new Promise(resolve => setTimeout(resolve, 10000)) // Increased to 10 seconds

      // Try to get the latest balance from the database (from callback or previous requests)
      let { data: latestBalance, error: balanceError } = await supabaseClient
        .from('balance_requests')
        .select('utility_account_balance, balance_after, updated_at, status, conversation_id')
        .eq('partner_id', partner.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      // If no completed balance found, try to find the pending request we just created
      if (!latestBalance || balanceError) {
        const { data: pendingBalance } = await supabaseClient
          .from('balance_requests')
          .select('utility_account_balance, balance_after, updated_at, status, conversation_id')
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
          timestamp: latestBalance.updated_at
        }
      }

      // If no balance_requests data, try to get from disbursement_requests (any status, not just success)
      const { data: latestDisbursement, error: disbursementError } = await supabaseClient
        .from('disbursement_requests')
        .select('utility_balance_at_transaction, balance_updated_at_transaction, updated_at, status')
        .eq('partner_id', partner.id)
        .not('utility_balance_at_transaction', 'is', null)
        .order('balance_updated_at_transaction', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (latestDisbursement && !disbursementError) {
        return {
          utility_account_balance: latestDisbursement.utility_balance_at_transaction
        }
      }
      // If no recent balance found, return null
      return {
        utility_account_balance: null
      }
    } else {
      throw new Error(`M-Pesa balance query failed: ${balanceData.ResponseCode} - ${balanceData.ResponseDescription}`)
    }

  } catch (error) {
    return {
      utility_account_balance: null
    }
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
  const alerts = []


  // Check utility account balance only
  if (balanceData.utility_account_balance !== null) {
    // Check for variance drop threshold first
    const varianceDropThreshold = config.variance_drop_threshold || 0
    
    if (varianceDropThreshold > 0) {
      // Get the previous balance to calculate variance
      const { data: previousBalance, error: prevError } = await supabaseClient
        .from('balance_requests')
        .select('utility_account_balance, created_at')
        .eq('partner_id', config.partner_id)
        .eq('status', 'completed')
        .not('utility_account_balance', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2) // Get 2 records to skip the current one

      if (!prevError && previousBalance && previousBalance.length > 1) {
        const previousBalanceAmount = previousBalance[1].utility_account_balance
        const currentBalanceAmount = balanceData.utility_account_balance
        const varianceDrop = previousBalanceAmount - currentBalanceAmount


        // Only send alert if variance drop exceeds the threshold
        if (varianceDrop > varianceDropThreshold) {
          const alert = await createBalanceAlert(
            supabaseClient,
            config,
            partner,
            'utility',
            currentBalanceAmount,
            previousBalanceAmount,
            'variance_drop',
            varianceDrop
          )
          if (alert) alerts.push(alert)
        }
      }
    }

    // Check low balance threshold (always check this regardless of variance drop threshold)
    const threshold = config.utility_account_threshold
    
    if (balanceData.utility_account_balance < threshold) {
      const alert = await createBalanceAlert(
        supabaseClient,
        config,
        partner,
        'utility',
        balanceData.utility_account_balance,
        threshold,
        'low_balance'
      )
      if (alert) {
        alerts.push(alert)
      }
    }
  }

  return alerts
}

async function createBalanceAlert(
  supabaseClient: any,
  config: BalanceMonitoringConfig,
  partner: Partner,
  accountType: string,
  currentBalance: number,
  threshold: number,
  alertType: string,
  varianceDrop?: number
): Promise<any | null> {
  // Creating balance alert

  // Check if we already sent an alert recently (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  
  const { data: recentAlert, error: recentAlertError } = await supabaseClient
    .from('balance_alerts')
    .select('id')
    .eq('partner_id', config.partner_id)
    .eq('account_type', accountType)
    .eq('alert_type', alertType)
    .gte('created_at', oneHourAgo)
    .limit(1)

  if (recentAlert && recentAlert.length > 0) {
    return null // Don't send duplicate alerts
  }

  let alertMessage = ''
  
  if (alertType === 'variance_drop') {
    alertMessage = `🚨 Variance Drop Alert for ${partner.name}\n` +
      `Current Utility Balance: KES ${currentBalance.toLocaleString()}\n` +
      `Previous Balance: KES ${threshold.toLocaleString()}\n` +
      `Variance Drop: KES ${varianceDrop?.toLocaleString()}\n` +
      `Variance Drop Threshold: KES ${config.variance_drop_threshold?.toLocaleString()}\n` +
      `Short Code: ${partner.mpesa_shortcode}\n` +
      `Time: ${new Date().toISOString()}`
  } else {
    alertMessage = `🚨 Low Utility Balance Alert for ${partner.name}\n` +
      `Current Utility Balance: KES ${currentBalance.toLocaleString()}\n` +
      `Threshold: KES ${threshold.toLocaleString()}\n` +
      `Short Code: ${partner.mpesa_shortcode}\n` +
      `Time: ${new Date().toISOString()}`
  }

  // Create alert record
  const { data: alert, error: alertError } = await supabaseClient
    .from('balance_alerts')
    .insert({
      partner_id: config.partner_id,
      balance_check_id: null, // Set to null since we're not using balance_checks table
      alert_type: alertType,
      account_type: accountType,
      current_balance: currentBalance,
      threshold_balance: threshold,
      alert_message: alertMessage,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (alertError) {
    return null
  }

  // Send Slack alert if configured
  if (config.slack_webhook_url) {
    try {
      await sendSlackAlert(config.slack_webhook_url, config.slack_channel, alertMessage)
      // Update alert as sent
      await supabaseClient
        .from('balance_alerts')
        .update({ slack_sent: true })
        .eq('id', alert.id)
    } catch (error) {
      // Slack alert failed - continue without failing the entire process
    }
  }

  return alert
}

async function sendSlackAlert(webhookUrl: string, channel: string | null, message: string): Promise<void> {
  const payload = {
    text: message,
    channel: channel || '#general',
    username: 'M-Pesa Balance Monitor',
    icon_emoji: ':money_with_wings:'
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`)
  }
}