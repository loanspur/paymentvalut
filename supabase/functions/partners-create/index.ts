import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CreatePartnerRequest {
  name: string
}

interface CreatePartnerResponse {
  success: boolean
  partner?: {
    id: string
    name: string
    api_key: string
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const body: CreatePartnerRequest = await req.json()

    if (!body.name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Partner name is required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate API key
    const apiKey = `kulmna_sk_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`

    // Hash the API key
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Create partner in database
    const { data: partner, error: dbError } = await supabaseClient
      .from('partners')
      .insert({
        name: body.name,
        api_key_hash: hashHex,
        is_active: true
      })
      .select('id, name')
      .single()

    if (dbError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create partner'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const response: CreatePartnerResponse = {
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        api_key: apiKey
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

