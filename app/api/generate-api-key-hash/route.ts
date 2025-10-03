import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.SAMPLE_API_KEY || 'your_sample_api_key_here'
    
    // Generate SHA-256 hash
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return NextResponse.json({
      api_key: apiKey,
      api_key_hash: hashHex,
      message: 'API key hash generated successfully'
    })

  } catch (error) {
    console.error('❌ Error generating API key hash:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
