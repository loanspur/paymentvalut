// Simple test version of disbursement Edge Function without duplicate prevention
// This helps isolate the issue

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DisburseRequest {
  amount: number
  msisdn: string
  tenant_id: string
  customer_id: string
  client_request_id: string
}

interface DisburseResponse {
  status: 'accepted' | 'rejected'
  disbursement_id?: string
  conversation_id?: string
  will_callback?: boolean
  error_code?: string
  error_message?: string
}

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

    // Get API key from headers
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'AUTH_1001',
          error_message: 'API key required'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify API key hash
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Find partner by API key hash
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('*')
      .eq('api_key_hash', hashHex)
      .eq('is_active', true)
      .single()

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'AUTH_1002',
          error_message: 'Invalid API key'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body: DisburseRequest = await req.json()

    // Validate request
    if (!body.amount || !body.msisdn || !body.tenant_id || !body.customer_id || !body.client_request_id) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1001',
          error_message: 'Missing required fields'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate MSISDN format (Kenyan format)
    const msisdnRegex = /^254[0-9]{9}$/
    if (!msisdnRegex.test(body.msisdn)) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'B2C_1002',
          error_message: 'Invalid MSISDN format. Use format: 254XXXXXXXXX'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create disbursement request in database
    const { data: disbursementRequest, error: createError } = await supabaseClient
      .from('disbursement_requests')
      .insert({
        origin: 'ui',
        tenant_id: body.tenant_id,
        customer_id: body.customer_id,
        client_request_id: body.client_request_id,
        msisdn: body.msisdn,
        amount: body.amount,
        status: 'queued',
        partner_id: partner.id
      })
      .select()
      .single()

    if (createError) {
      return new Response(
        JSON.stringify({
          status: 'rejected',
          error_code: 'DB_1001',
          error_message: `Failed to create disbursement request: ${createError.message}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For now, just return success without calling M-Pesa API
    // This helps us test if the basic flow works
    const response: DisburseResponse = {
      status: 'accepted',
      disbursement_id: disbursementRequest.id,
      conversation_id: `test_${Date.now()}`,
      will_callback: false
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'rejected',
        error_code: 'API_1001',
        error_message: `Internal server error: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
