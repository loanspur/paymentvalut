import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing callback endpoint accessibility...')
    
    // Test if we can reach the callback endpoints
    const callbackUrls = [
      'https://realspur.com/api/mpesa-callback/result',
      'https://realspur.com/api/mpesa-callback/timeout'
    ]
    
    const results = []
    
    for (const url of callbackUrls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            test: 'connectivity',
            timestamp: new Date().toISOString()
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })
        
        results.push({
          url,
          status: response.status,
          accessible: response.ok,
          message: response.ok ? 'Accessible' : `HTTP ${response.status}`
        })
      } catch (error) {
        results.push({
          url,
          status: 'error',
          accessible: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      message: 'Callback endpoint accessibility test',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error testing callback accessibility:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
