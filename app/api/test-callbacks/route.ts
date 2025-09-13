import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing callback URL accessibility...')
    
    const callbackUrls = {
      timeout: "https://mpesab2c-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/timeout",
      result: "https://mpesab2c-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/result"
    }

    // Test both callback URLs
    const tests = []
    
    for (const [type, url] of Object.entries(callbackUrls)) {
      try {
        console.log(`Testing ${type} callback: ${url}`)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            test: true,
            type: type,
            timestamp: new Date().toISOString()
          })
        })
        
        tests.push({
          type: type,
          url: url,
          status: response.status,
          accessible: response.ok,
          error: null
        })
        
        console.log(`${type} callback test: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`)
        
      } catch (error) {
        tests.push({
          type: type,
          url: url,
          status: null,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        console.error(`${type} callback test failed:`, error)
      }
    }

    return NextResponse.json({
      message: 'Callback URL accessibility test completed',
      timestamp: new Date().toISOString(),
      tests: tests,
      summary: {
        total: tests.length,
        accessible: tests.filter(t => t.accessible).length,
        failed: tests.filter(t => !t.accessible).length
      }
    })

  } catch (error) {
    console.error('❌ Callback test failed:', error)
    return NextResponse.json({
      error: 'Callback test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
