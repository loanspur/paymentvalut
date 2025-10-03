import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Test callback received')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    const body = await req.text()
    console.log('Body:', body)
    
    // Try to parse as JSON
    try {
      const jsonBody = JSON.parse(body)
      console.log('Parsed JSON:', JSON.stringify(jsonBody, null, 2))
    } catch (e) {
      console.log('Body is not valid JSON')
    }
    
    console.log('✅ Test callback processed successfully')
    
    return new Response('OK', { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })

  } catch (error) {
    console.error('❌ Error in test callback:', error)
    return new Response('Error', { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }
})

