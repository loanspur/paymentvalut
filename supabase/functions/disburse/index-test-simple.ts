import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DisbursementParams {
  partner_id: string
  amount: number
  msisdn: string
  remarks?: string
  occasion?: string
  tenant_id?: string
  customer_id?: string
  client_request_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Simple test function started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('✅ Supabase client created')

    // Test database connection
    const { data: testData, error: testError } = await supabaseClient
      .from('partners')
      .select('id, name')
      .limit(1)

    if (testError) {
      console.log('❌ Database connection test failed:', testError)
      return new Response(
        JSON.stringify({ error: 'Database connection failed', details: testError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Database connection successful')

    // Test vault credentials retrieval
    const { data: partnerData, error: partnerError } = await supabaseClient
      .from('partners')
      .select('id, name, encrypted_credentials, vault_passphrase_hash')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000') // Use your test partner ID
      .single()

    if (partnerError) {
      console.log('❌ Partner data retrieval failed:', partnerError)
      return new Response(
        JSON.stringify({ error: 'Partner data retrieval failed', details: partnerError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Partner data retrieved:', partnerData.name)

    // Test simple database insert
    const { data: insertData, error: insertError } = await supabaseClient
      .from('disbursement_requests')
      .insert({
        partner_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1.00,
        msisdn: '254700000000',
        status: 'submitted', // Try different status values
        conversation_id: 'TEST_' + Date.now(),
        origin: 'ui',
        tenant_id: 'TEST_TENANT',
        customer_id: 'TEST_CUSTOMER',
        client_request_id: 'TEST_' + Date.now()
      })
      .select()
      .single()

    if (insertError) {
      console.log('❌ Database insert test failed:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Database insert test failed', 
          details: insertError,
          testData: testData,
          partnerData: { id: partnerData.id, name: partnerData.name }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Database insert test successful')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All tests passed',
        testData: testData,
        partnerData: { id: partnerData.id, name: partnerData.name },
        insertData: insertData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('❌ Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Function error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
