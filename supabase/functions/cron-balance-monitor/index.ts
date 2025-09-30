// Cron Job for Balance Monitoring
// This function is called by Supabase Cron to check balances periodically
// It respects individual partner settings for check intervals and monitoring configuration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🕐 [Cron] Balance monitoring cron job triggered')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get all enabled monitoring configurations
    const { data: configs, error: configError } = await supabaseClient
      .from('balance_monitoring_config')
      .select(`
        id,
        partner_id,
        check_interval_minutes,
        is_enabled,
        last_checked_at,
        working_account_threshold,
        utility_account_threshold,
        charges_account_threshold,
        variance_drop_threshold,
        slack_webhook_url,
        slack_channel
      `)
      .eq('is_enabled', true)

    if (configError) {
      console.error('❌ [Cron] Error fetching monitoring configs:', configError)
      throw new Error('Failed to fetch monitoring configurations')
    }

    if (!configs || configs.length === 0) {
      console.log('ℹ️ [Cron] No enabled monitoring configurations found')
      return new Response(JSON.stringify({
        message: 'No enabled monitoring configurations found',
        timestamp: new Date().toISOString(),
        checked_partners: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📊 [Cron] Found ${configs.length} enabled monitoring configurations`)

    const now = new Date()
    let checkedPartners = 0
    let skippedPartners = 0
    const results = []

    // Check each partner's configuration to see if it's time to check their balance
    for (const config of configs) {
      try {
        const lastChecked = config.last_checked_at ? new Date(config.last_checked_at) : null
        const checkInterval = config.check_interval_minutes * 60 * 1000 // Convert to milliseconds
        
        // Check if it's time to check this partner's balance
        if (lastChecked && (now.getTime() - lastChecked.getTime()) < checkInterval) {
          const timeUntilNext = Math.ceil((checkInterval - (now.getTime() - lastChecked.getTime())) / 60000) // minutes
          console.log(`⏭️ [Cron] Skipping partner ${config.partner_id} - next check in ${timeUntilNext} minutes`)
          skippedPartners++
          results.push({
            partner_id: config.partner_id,
            status: 'skipped',
            reason: `Next check in ${timeUntilNext} minutes`,
            check_interval_minutes: config.check_interval_minutes
          })
          continue
        }

        // It's time to check this partner's balance
        console.log(`🔄 [Cron] Checking balance for partner ${config.partner_id} (interval: ${config.check_interval_minutes} minutes)`)
        
        // Call the balance-monitor function for this specific partner
        const balanceMonitorUrl = `${supabaseUrl}/functions/v1/balance-monitor`
        
        const response = await fetch(balanceMonitorUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            partner_id: config.partner_id,
            force_check: false // Let the balance-monitor function handle the timing logic
          })
        })

        const result = await response.json()

        if (response.ok) {
          console.log(`✅ [Cron] Balance check completed for partner ${config.partner_id}`)
          checkedPartners++
          results.push({
            partner_id: config.partner_id,
            status: 'checked',
            result: result
          })
        } else {
          console.error(`❌ [Cron] Balance check failed for partner ${config.partner_id}:`, result)
          results.push({
            partner_id: config.partner_id,
            status: 'error',
            error: result.error || 'Unknown error'
          })
        }

      } catch (error) {
        console.error(`❌ [Cron] Error processing partner ${config.partner_id}:`, error)
        results.push({
          partner_id: config.partner_id,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log(`✅ [Cron] Balance monitoring cron job completed: ${checkedPartners} checked, ${skippedPartners} skipped`)
    
    return new Response(JSON.stringify({
      message: 'Balance monitoring cron job completed',
      timestamp: new Date().toISOString(),
      summary: {
        total_configs: configs.length,
        checked_partners: checkedPartners,
        skipped_partners: skippedPartners,
        error_partners: results.filter(r => r.status === 'error').length
      },
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ [Cron] Cron job failed:', error)
    return new Response(JSON.stringify({ 
      error: 'Cron job failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

