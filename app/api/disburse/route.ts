import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const apiKey = request.headers.get('x-api-key')
    
    console.log('🚀 Disbursement request received:', { 
      body: {
        ...body,
        amount: body.amount,
        msisdn: body.msisdn,
        partner_id: body.partner_id
      }, 
      apiKey: apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'
    })
    
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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { 
          status: 'rejected',
          error_code: 'CONFIG_1001',
          error_message: 'Server configuration error' 
        },
        { status: 500 }
      )
    }

    // Forward the request to the real Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/disburse`
    
    console.log('Forwarding to Edge Function:', edgeFunctionUrl)
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    })

    const responseData = await response.json()
    
    console.log('📡 Edge Function response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      conversationId: responseData.conversation_id,
      disbursementId: responseData.disbursement_id,
      timestamp: new Date().toISOString()
    })
    
    // Log the complete response for Safaricom support
    console.log('🔍 COMPLETE RESPONSE FOR SAFARICOM SUPPORT:', {
      requestDetails: {
        url: 'M-Pesa B2C API',
        method: 'POST',
        body: body,
        timestamp: new Date().toISOString()
      },
      responseDetails: {
        status: response.status,
        statusText: response.statusText,
        fullResponse: responseData,
        conversationId: responseData.conversation_id,
        disbursementId: responseData.disbursement_id
      }
    })
    
    return NextResponse.json(responseData, { status: response.status })
    
  } catch (error) {
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
