import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { DuplicatePreventionService } from '../_shared/duplicate-prevention.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(`Missing environment variables: supabaseUrl=${!!supabaseUrl}, serviceKey=${!!supabaseServiceKey}`)
    }
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    const duplicatePrevention = new DuplicatePreventionService(supabaseClient)

    // Get all active partners
    const { data: partners, error: partnersError } = await supabaseClient
      .from('partners')
      .select('id, name')
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)

    if (partnersError) {
      throw new Error(`Failed to fetch partners: ${partnersError.message}`)
    }

    const results = []

    // Process insufficient funds queue for each partner
    for (const partner of partners || []) {
      try {
        await duplicatePrevention.processInsufficientFundsQueue(partner.id)
        
        // Get queue statistics
        const { data: queueStats } = await supabaseClient
          .from('insufficient_funds_queue')
          .select('status')
          .eq('partner_id', partner.id)

        const stats = {
          queued: queueStats?.filter(q => q.status === 'queued').length || 0,
          processing: queueStats?.filter(q => q.status === 'processing').length || 0,
          completed: queueStats?.filter(q => q.status === 'completed').length || 0,
          failed: queueStats?.filter(q => q.status === 'failed').length || 0
        }

        results.push({
          partner_id: partner.id,
          partner_name: partner.name,
          status: 'processed',
          queue_stats: stats
        })

      } catch (error) {
        results.push({
          partner_id: partner.id,
          partner_name: partner.name,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Insufficient funds queue processed',
        timestamp: new Date().toISOString(),
        results: results,
        summary: {
          total_partners: partners?.length || 0,
          processed: results.filter(r => r.status === 'processed').length,
          errors: results.filter(r => r.status === 'error').length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Queue processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
