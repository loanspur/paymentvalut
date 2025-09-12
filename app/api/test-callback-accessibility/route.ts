import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing callback accessibility...')
    
    // Test if this endpoint is accessible from external sources
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const origin = request.headers.get('origin') || 'Unknown'
    const referer = request.headers.get('referer') || 'Unknown'
    
    return NextResponse.json({
      message: 'Callback endpoint is accessible',
      timestamp: new Date().toISOString(),
      request_info: {
        user_agent: userAgent,
        origin: origin,
        referer: referer,
        method: request.method,
        url: request.url
      },
      status: 'success'
    })

  } catch (error) {
    console.error('❌ Error testing callback accessibility:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Testing callback POST accessibility...')
    
    const body = await request.text()
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    
    return NextResponse.json({
      message: 'Callback POST endpoint is accessible',
      timestamp: new Date().toISOString(),
      received_data: body,
      request_info: {
        user_agent: userAgent,
        content_type: request.headers.get('content-type'),
        content_length: request.headers.get('content-length')
      },
      status: 'success'
    })

  } catch (error) {
    console.error('❌ Error testing callback POST accessibility:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}