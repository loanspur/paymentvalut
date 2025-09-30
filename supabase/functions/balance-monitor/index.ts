import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Inline CredentialManager class (since _shared doesn't work with Supabase Edge Functions)
interface EncryptedCredentials {
  consumer_key: string
  consumer_secret: string
  initiator_password: string
  security_credential: string
  shortcode: string
}

interface DecryptedCredentials {
  consumer_key: string
  consumer_secret: string
  initiator_password: string
  security_credential: string
  shortcode: string
  environment?: string
}

class CredentialManager {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  // Generate a key from a passphrase
  private static async generateKey(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('mpesa-vault-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Encrypt credentials
  static async encryptCredentials(credentials: DecryptedCredentials, passphrase: string): Promise<string> {
    try {
      const key = await this.generateKey(passphrase)
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(credentials))

      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      // Return base64 encoded string
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      throw new Error('Failed to encrypt credentials')
    }
  }

  // Decrypt credentials
  static async decryptCredentials(encryptedData: string, passphrase: string): Promise<DecryptedCredentials> {
    try {
      const key = await this.generateKey(passphrase)
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      )

      const iv = combined.slice(0, this.IV_LENGTH)
      const encrypted = combined.slice(this.IV_LENGTH)

      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      const decryptedText = decoder.decode(decrypted)
      return JSON.parse(decryptedText)
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
      .select('id, name, encrypted_credentials, consumer_key, consumer_secret, initiator_password, security_credential, mpesa_environment')
      .eq('id', partnerId)
      .single()

    if (error) {
      console.error(`❌ [CredentialManager] Error fetching partner ${partnerId}:`, error)
      throw new Error(`Partner not found: ${error.message}`)
    }

    if (!partner) {
      throw new Error(`Partner with ID ${partnerId} not found`)
    }

    console.log(`🔍 [CredentialManager] Partner ${partner.name} (${partnerId}):`, {
      hasEncryptedCredentials: !!partner.encrypted_credentials,
      hasConsumerKey: !!partner.consumer_key,
      hasConsumerSecret: !!partner.consumer_secret,
      hasInitiatorPassword: !!partner.initiator_password,
      hasSecurityCredential: !!partner.security_credential,
      environment: partner.mpesa_environment
    })

    // Try to use encrypted credentials first
    if (partner.encrypted_credentials) {
      try {
        console.log(`🔓 [CredentialManager] Decrypting credentials for ${partner.name}`)
        return await this.decryptCredentials(partner.encrypted_credentials, passphrase)
      } catch (decryptError) {
        console.error(`❌ [CredentialManager] Failed to decrypt credentials for ${partner.name}:`, decryptError)
        // Fall through to use plain text credentials
      }
    }

    // Fallback to plain text credentials if encrypted ones are not available or fail to decrypt
    if (partner.consumer_key && partner.consumer_secret && partner.initiator_password && partner.security_credential) {
      console.log(`📝 [CredentialManager] Using plain text credentials for ${partner.name}`)
      return {
        consumer_key: partner.consumer_key,
        consumer_secret: partner.consumer_secret,
        initiator_password: partner.initiator_password,
        security_credential: partner.security_credential,
        shortcode: partner.mpesa_shortcode || '',
        environment: partner.mpesa_environment || 'sandbox'
      }
    }

    throw new Error(`No valid credentials found for partner ${partner.name} (${partnerId}). Missing: ${[
      !partner.consumer_key && 'consumer_key',
      !partner.consumer_secret && 'consumer_secret', 
      !partner.initiator_password && 'initiator_password',
      !partner.security_credential && 'security_credential'
    ].filter(Boolean).join(', ')}`)
  }

  // Store encrypted credentials for a partner
  static async storePartnerCredentials(
    partnerId: string, 
    credentials: DecryptedCredentials, 
    passphrase: string
  ): Promise<void> {
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Encrypt credentials
    const encryptedCredentials = await this.encryptCredentials(credentials, passphrase)

    // Store in database
    const { error } = await supabase
      .from('partners')
      .update({ 
        encrypted_credentials: encryptedCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerId)

    if (error) {
      throw new Error(`Failed to store encrypted credentials: ${error.message}`)
    }
  }
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
      console.log('balance_monitoring_config not found, trying partner_balance_configs')
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

        // Get current balance from M-Pesa API
        let balanceData
        try {
          balanceData = await getCurrentBalance(supabaseClient, partner)
        } catch (balanceError) {
          console.error(`❌ [Balance Monitor] Failed to get balance for ${partner.name}:`, balanceError)
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

        console.log(`🔍 [Balance Monitor] Balance data for ${partner.name}:`, balanceData)
        
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
    
    // Get credentials from vault
    const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
    
    let credentials
    try {
      console.log(`🔍 [Balance Monitor] Retrieving credentials for ${partner.name} (${partner.id})`)
      credentials = await CredentialManager.getPartnerCredentials(partner.id, vaultPassphrase)
      console.log('✅ Credentials retrieved from vault for balance check:', {
        partnerId: partner.id,
        partnerName: partner.name,
        hasConsumerKey: !!credentials.consumer_key,
        hasConsumerSecret: !!credentials.consumer_secret,
        hasSecurityCredential: !!credentials.security_credential,
        environment: credentials.environment
      })
    } catch (vaultError) {
      console.error(`❌ [Balance Monitor] Failed to retrieve credentials for ${partner.name} (${partner.id}):`, vaultError)
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
      Initiator: credentials.initiator_name || 'testapi',
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
      console.log(`✅ [Balance Monitor] Balance request initiated for ${partner.name}`)
      
      // Store the balance request in the database
      const { error: insertError } = await supabaseClient
        .from('balance_requests')
        .insert({
          partner_id: partner.id,
          request_id: balanceData.OriginatorConversationID,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error storing balance request:', insertError)
      }

      // Wait a moment for the callback to potentially arrive
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Try to get the latest balance from the database (from callback or previous requests)
      const { data: latestBalance, error: balanceError } = await supabaseClient
        .from('balance_requests')
        .select('utility_account_balance, balance_after, updated_at')
        .eq('partner_id', partner.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (latestBalance && !balanceError) {
        console.log(`✅ [Balance Monitor] Found balance from balance_requests for ${partner.name}:`, latestBalance)
        return {
          utility_account_balance: latestBalance.utility_account_balance || latestBalance.balance_after
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
        console.log(`✅ [Balance Monitor] Found balance from disbursement_requests for ${partner.name}:`, latestDisbursement)
        return {
          utility_account_balance: latestDisbursement.utility_balance_at_transaction
        }
      }

      console.log(`⚠️ [Balance Monitor] No balance data found for ${partner.name}`)
      // If no recent balance found, return null
      return {
        utility_account_balance: null
      }
    } else {
      throw new Error(`M-Pesa balance query failed: ${balanceData.ResponseDescription}`)
    }

  } catch (error) {
    console.error(`❌ [Balance Monitor] Error getting balance for ${partner.name}:`, error)
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