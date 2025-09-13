// Cron Job for Balance Monitoring
// This function is called by Supabase Cron to check balances periodically

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    console.log('🕐 Cron job triggered: Balance monitoring check')

    // Call the balance-monitor function
    const balanceMonitorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/balance-monitor`
    
    const response = await fetch(balanceMonitorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: 'Balance monitoring failed',
        details: result 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Balance monitoring completed successfully')
    
    return new Response(JSON.stringify({
      message: 'Balance monitoring cron job completed',
      timestamp: new Date().toISOString(),
      result: result
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Cron job failed',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

