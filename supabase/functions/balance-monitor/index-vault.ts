import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { CredentialManager } from '../_shared/credential-manager.ts'

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

    console.log('🔍 Starting balance monitoring with vault credentials...')

    // Get all enabled balance monitoring configurations
    const { data: configs, error: configError } = await supabaseClient
      .from('balance_monitoring_configs')
      .select('*')
      .eq('is_enabled', true)

    if (configError) {
      throw new Error(`Failed to fetch monitoring configs: ${configError.message}`)
    }

    if (!configs || configs.length === 0) {
      console.log('ℹ️ No active balance monitoring configurations found')
      return new Response(
        JSON.stringify({ message: 'No active monitoring configurations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`📊 Found ${configs.length} active monitoring configurations`)

    const results = []

    for (const config of configs) {
      try {
        console.log(`🔍 Checking balance for partner: ${config.partner_id}`)

        // Get partner basic info (without credentials)
        const { data: partner, error: partnerError } = await supabaseClient
          .from('partners')
          .select('id, name, mpesa_shortcode, mpesa_environment')
          .eq('id', config.partner_id)
          .single()

        if (partnerError || !partner) {
          console.log(`❌ Partner not found: ${config.partner_id}`, partnerError)
          continue
        }

        // Get credentials from vault
        const vaultPassphrase = Deno.env.get('MPESA_VAULT_PASSPHRASE') || 'mpesa-vault-passphrase-2025'
        
        let credentials
        try {
          credentials = await CredentialManager.getPartnerCredentials(config.partner_id, vaultPassphrase)
          console.log('✅ Credentials retrieved from vault for balance check:', {
            partnerId: config.partner_id,
            hasConsumerKey: !!credentials.consumer_key,
            hasConsumerSecret: !!credentials.consumer_secret,
            environment: credentials.environment
          })
        } catch (vaultError) {
          console.log('❌ Failed to retrieve credentials from vault for balance check:', vaultError)
          continue
        }

        const consumerKey = credentials.consumer_key
        const consumerSecret = credentials.consumer_secret
        const environment = credentials.environment || partner.mpesa_environment || 'sandbox'

        if (!consumerKey || !consumerSecret) {
          console.log(`❌ Missing credentials for partner: ${config.partner_id}`)
          continue
        }

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
          console.log(`❌ Token error for partner ${config.partner_id}:`, tokenData)
          continue
        }
        
        const accessToken = tokenData.access_token
        
        if (!accessToken) {
          console.log(`❌ No access token for partner ${config.partner_id}`)
          continue
        }

        // Check account balance
        const balanceResponse = await fetch(`${baseUrl}/mpesa/accountbalance/v1/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Initiator: 'LSVaultAPI',
            SecurityCredential: credentials.initiator_password || 'dummy', // Use from vault
            CommandID: 'AccountBalance',
            PartyA: partner.mpesa_shortcode,
            IdentifierType: '4',
            Remarks: 'Balance Check',
            QueueTimeOutURL: `${Deno.env.get('CALLBACK_BASE_URL') || 'https://cbsvault.co.ke'}/api/mpesa-callback/timeout`,
            ResultURL: `${Deno.env.get('CALLBACK_BASE_URL') || 'https://cbsvault.co.ke'}/api/mpesa-callback/result`
          })
        })

        const balanceData = await balanceResponse.json()
        
        console.log(`💰 Balance response for ${partner.name}:`, {
          status: balanceResponse.status,
          response: balanceData
        })

        // Store balance data
        const { error: balanceError } = await supabaseClient
          .from('mpesa_balance_history')
          .insert({
            partner_id: config.partner_id,
            balance_data: balanceData,
            response_code: balanceData.ResponseCode,
            response_description: balanceData.ResponseDescription,
            conversation_id: balanceData.ConversationID,
            originator_conversation_id: balanceData.OriginatorConversationID
          })

        if (balanceError) {
          console.log(`❌ Error storing balance data for ${partner.name}:`, balanceError)
        }

        // Update last checked timestamp
        await supabaseClient
          .from('balance_monitoring_configs')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', config.id)

        results.push({
          partner_id: config.partner_id,
          partner_name: partner.name,
          status: 'checked',
          response_code: balanceData.ResponseCode,
          response_description: balanceData.ResponseDescription
        })

      } catch (error) {
        console.log(`❌ Error checking balance for partner ${config.partner_id}:`, error)
        results.push({
          partner_id: config.partner_id,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log('✅ Balance monitoring completed:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Balance monitoring completed',
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Balance monitoring error:', error)
    
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
