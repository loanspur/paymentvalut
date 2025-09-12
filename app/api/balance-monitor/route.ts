import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting balance monitoring check...')

    // Get all enabled monitoring configurations
    // Try balance_monitoring_config first, fallback to partner_balance_configs
    let { data: configs, error: configError } = await supabase
      .from('balance_monitoring_config')
      .select('*')
      .eq('is_enabled', true)

    // If table doesn't exist, try partner_balance_configs
    if (configError && configError.code === 'PGRST205') {
      console.log('balance_monitoring_config not found, trying partner_balance_configs')
      const result = await supabase
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
      return NextResponse.json({ 
        message: 'No monitoring configurations found',
        results: []
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
        const { data: partner, error: partnerError } = await supabase
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

        // Check if partner has valid M-Pesa credentials
        if (!partner.mpesa_consumer_key || !partner.mpesa_consumer_secret || 
            partner.mpesa_consumer_key.includes('PLACEHOLDER') || 
            partner.mpesa_consumer_key.includes('KULMAN_REAL') ||
            partner.mpesa_consumer_secret.includes('PLACEHOLDER') ||
            partner.mpesa_consumer_secret.includes('KULMAN_REAL')) {
          results.push({
            partner_id: config.partner_id,
            partner_name: partner.name,
            status: 'error',
            reason: 'Invalid or placeholder M-Pesa credentials'
          })
          continue
        }

        // Get current balance from latest transaction
        const balanceData = await getCurrentBalance(supabase, config.partner_id)
        
        // Check thresholds and send alerts if needed
        const alerts = await checkBalanceThresholds(
          supabase,
          config,
          partner,
          balanceData
        )

        // Update last checked time
        // Try balance_monitoring_config first, fallback to partner_balance_configs
        let updateError = await supabase
          .from('balance_monitoring_config')
          .update({ last_checked_at: now.toISOString() })
          .eq('id', config.id)

        // If table doesn't exist, try partner_balance_configs
        if (updateError && updateError.code === 'PGRST205') {
          await supabase
            .from('partner_balance_configs')
            .update({ updated_at: now.toISOString() })
            .eq('id', config.id)
        }

        results.push({
          partner_id: config.partner_id,
          partner_name: partner.name,
          status: 'checked',
          balance_data: balanceData,
          alerts_sent: alerts.length,
          alerts: alerts
        })

      } catch (error) {
        console.error(`Error checking partner ${config.partner_id}:`, error)
        results.push({
          partner_id: config.partner_id,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Balance monitoring completed',
      timestamp: new Date().toISOString(),
      results: results
    })

  } catch (error) {
    console.error('Balance monitoring error:', error)
    return NextResponse.json({
      error: 'Balance monitoring failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getCurrentBalance(supabaseClient: any, partnerId: string): Promise<any> {
  try {
    // First, try to get balance from M-Pesa API directly
    const mpesaBalance = await getMpesaAccountBalance(supabaseClient, partnerId)
    if (mpesaBalance) {
      return mpesaBalance
    }
  } catch (error) {
    console.log('M-Pesa API balance fetch failed, falling back to disbursement records:', error)
  }

  // Fallback: Get the latest balance data from disbursement_requests
  const { data: latestDisbursement, error } = await supabaseClient
    .from('disbursement_requests')
    .select('mpesa_working_account_balance, mpesa_utility_account_balance, mpesa_charges_account_balance, balance_updated_at')
    .eq('partner_id', partnerId)
    .not('mpesa_working_account_balance', 'is', null)
    .order('balance_updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !latestDisbursement) {
    return {
      working_account_balance: null,
      utility_account_balance: null,
      charges_account_balance: null
    }
  }

  return {
    working_account_balance: latestDisbursement.mpesa_working_account_balance,
    utility_account_balance: latestDisbursement.mpesa_utility_account_balance,
    charges_account_balance: latestDisbursement.mpesa_charges_account_balance
  }
}

async function getMpesaAccountBalance(supabaseClient: any, partnerId: string): Promise<any> {
  // Get partner M-Pesa credentials
  const { data: partner, error: partnerError } = await supabaseClient
    .from('partners')
    .select('mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_environment, mpesa_initiator_name, mpesa_initiator_password')
    .eq('id', partnerId)
    .single()

  if (partnerError || !partner || !partner.mpesa_consumer_key || !partner.mpesa_consumer_secret) {
    throw new Error('Partner M-Pesa credentials not configured')
  }

  const consumerKey = partner.mpesa_consumer_key
  const consumerSecret = partner.mpesa_consumer_secret
  const shortCode = partner.mpesa_shortcode
  const environment = partner.mpesa_environment || 'production'

  // Get access token
  const baseUrl = environment === 'production' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke'

  const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
    }
  })

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token

  if (!accessToken) {
    throw new Error('No access token received from M-Pesa API')
  }

  // Since M-Pesa doesn't have a direct balance inquiry API, we'll use the account balance
  // from the transaction status API or simulate a small transaction to get balance info
  // For now, let's try to get balance from transaction history
  
  // Note: M-Pesa doesn't provide a direct balance inquiry API
  // The balance information is typically obtained through:
  // 1. Transaction callbacks
  // 2. Account statements
  // 3. USSD responses
  
  // For this implementation, we'll return null to indicate we need to use
  // the fallback method (disbursement records)
  return null
}

async function checkBalanceThresholds(
  supabaseClient: any,
  config: any,
  partner: any,
  balanceData: any
): Promise<any[]> {
  const alerts = []

  // Check working account balance
  if (balanceData.working_account_balance !== null) {
    const threshold = config.working_account_threshold || config.low_balance_threshold || 1000
    if (balanceData.working_account_balance < threshold) {
      const alert = await createBalanceAlert(
        supabaseClient,
        config,
        partner,
        'working',
        balanceData.working_account_balance,
        threshold,
        'low_balance'
      )
      if (alert) alerts.push(alert)
    }
  }

  // Check utility account balance
  if (balanceData.utility_account_balance !== null) {
    const threshold = config.utility_account_threshold || 500
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

  // Check charges account balance
  if (balanceData.charges_account_balance !== null) {
    const threshold = config.charges_account_threshold || 200
    if (balanceData.charges_account_balance < threshold) {
      const alert = await createBalanceAlert(
        supabaseClient,
        config,
        partner,
        'charges',
        balanceData.charges_account_balance,
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
  config: any,
  partner: any,
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

  const alertMessage = `🚨 Low Balance Alert for ${partner.name}\n` +
    `Account: ${accountType.toUpperCase()}\n` +
    `Current Balance: KES ${currentBalance.toLocaleString()}\n` +
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
    console.error('Failed to create alert:', alertError)
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
      console.error('Failed to send Slack alert:', error)
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

