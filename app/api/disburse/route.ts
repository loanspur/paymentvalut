import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Disbursement request received
    const body = await request.json()
    const apiKey = request.headers.get('x-api-key')
    
    // Request details logged
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          status: 'rejected',
          error_code: 'AUTH_1001',
          error_message: 'API key required' 
        },
        { status: 401 }
      )
    }

    // Call the real Edge Function for all valid API keys
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { 
          status: 'rejected',
          error_code: 'CONFIG_1001',
          error_message: 'Server configuration error' 
        },
        { status: 500 }
      )
    }

    // Forward the request to the Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/disburse`
    
    // Forwarding request to Edge Function
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    })

    const responseData = await response.json()
    
    // Edge Function response received
    
    return NextResponse.json(responseData, { status: response.status })
    
  } catch (error) {
    console.error('❌ [API] Error in /api/disburse:', error)
    
    return NextResponse.json(
      { 
        status: 'rejected',
        error_code: 'API_1001',
        error_message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
