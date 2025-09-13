import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
  mpesa_consumer_key: string
  mpesa_consumer_secret: string
  mpesa_environment: string
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get all enabled monitoring configurations
    // Try balance_monitoring_config first, fallback to partner_balance_configs
    let { data: configs, error: configError } = await supabaseClient
      .from('balance_monitoring_config')
      .select('*')
      .eq('is_enabled', true)

    // If table doesn't exist, try partner_balance_configs
    if (configError && configError.code === 'PGRST205') {
      console.log('balance_monitoring_config not found, trying partner_balance_configs')
      const result = await supabaseClient
        .from('partner_balance_configs')
        .select('*')
        .eq('is_monitoring_enabled', true)
      
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
        // Check if it's time to check this partner's balance
        const lastChecked = config.last_checked_at ? new Date(config.last_checked_at) : null
        const now = new Date()
        const checkInterval = config.check_interval_minutes * 60 * 1000 // Convert to milliseconds
        
        if (lastChecked && (now.getTime() - lastChecked.getTime()) < checkInterval) {
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
          .select('id, name, mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_environment')
          .eq('id', config.partner_id)
          .single()

        if (partnerError || !partner) {
          results.push({
            partner_id: config.partner_id,
            status: 'error',
            reason: 'Partner not found'
          })
          continue
        }

        // Get current balance from M-Pesa API
        const balanceData = await getCurrentBalance(supabaseClient, partner)
        
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
          alerts: alerts
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

async function getCurrentBalance(supabaseClient: any, partner: Partner): Promise<BalanceData> {
  try {
    console.log(`🔍 Getting real-time balance for ${partner.name} (${partner.mpesa_shortcode})`)
    
    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken(partner)
    if (!accessToken) {
      throw new Error('Failed to get M-Pesa access token')
    }

    // Call M-Pesa account balance API
    const balanceUrl = partner.mpesa_environment === 'production' 
      ? 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query'
      : 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query'

    const balanceRequest = {
      Initiator: 'LSVaultAPI',
      SecurityCredential: 'cxTWGd+ZPS6KJQoXv225RkGgRetIxOlIvZCCTcN2DinhWlzG+nyo5gAGpw5Q/P/pMDlvPlwFUNepKR6FXhovMl9DkOKOVxDSIDCfbE+mNnwo6wFTuSKaC2SHHmA/fl9Z5iYf3e9APKGUeSQEs84REe+mlBmBi38XcqefhIVs5ULOOHCcXVZDpuq2oDf7yhYVU3NTBu3Osz8Tk9TJdJvEoB8Ozz+UL9137KSp+vi+16AU2Az4mkSEnsKcNzsjYOp0/ufxV9GbtaC2NSx8IEbRt6BbOtjdccYee+MptmbolkE++QkvcrwlgSi8BBEYpcuMZLLc8s4o5pB84HUwbPgTfA==',
      CommandID: 'AccountBalance',
      PartyA: partner.mpesa_shortcode,
      IdentifierType: '4',
      Remarks: 'Balance inquiry',
      QueueTimeOutURL: 'https://mapgmmiobityxaaevomp.supabase.co/functions/v1/test-callback',
      ResultURL: 'https://mapgmmiobityxaaevomp.supabase.co/functions/v1/test-callback'
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
      
      // The balance data will come through a callback, so for now we'll use historical data
      // or return null to indicate we need to wait for the callback
      return {
        utility_account_balance: null // Will be updated when callback is received
      }
    } else {
      throw new Error(`M-Pesa balance query failed: ${balanceData.ResponseDescription}`)
    }

  } catch (error) {
    return {
      utility_account_balance: null
    }
  }
}

async function getMpesaAccessToken(partner: Partner): Promise<string | null> {
  try {
    const authUrl = partner.mpesa_environment === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'

    const auth = btoa(`${partner.mpesa_consumer_key}:${partner.mpesa_consumer_secret}`)
    
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
      if (alert) alerts.push(alert)
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
  alertType: string
): Promise<any | null> {
  // Check if we already sent an alert recently (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data: recentAlert } = await supabaseClient
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

  const alertMessage = `🚨 Low Utility Balance Alert for ${partner.name}\n` +
    `Current Utility Balance: KES ${currentBalance.toLocaleString()}\n` +
    `Threshold: KES ${threshold.toLocaleString()}\n` +
    `Short Code: ${partner.mpesa_shortcode}\n` +
    `Time: ${new Date().toISOString()}`

  // Create alert record
  const { data: alert, error: alertError } = await supabaseClient
    .from('balance_alerts')
    .insert({
      partner_id: config.partner_id,
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