import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Callback endpoint is working',
    timestamp: new Date().toISOString(),
    domain: 'realspur.com',
    status: 'active'
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔔 Test callback received:', JSON.stringify(body, null, 2))
    
    return NextResponse.json({ 
      message: 'Test callback processed successfully',
      received_data: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error processing test callback:', error)
    return NextResponse.json({ 
      message: 'Test callback received but error processing',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}
