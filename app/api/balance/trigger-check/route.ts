import { NextRequest, NextResponse } from 'next/server'

// Proxy endpoint to trigger the Supabase balance monitor Edge Function
// Usage: POST /api/balance/trigger-check  with optional JSON body { partner_id: string, force_check: boolean }

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase configuration (URL or service key)'
        },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const functionUrl = `${supabaseUrl}/functions/v1/balance-monitor`
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ force_check: true, ...body })
    })

    const data = await response.text()
    let json
    try {
      json = JSON.parse(data)
    } catch {
      json = { raw: data }
    }

    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        result: json
      },
      { status: response.ok ? 200 : response.status }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger balance monitor',
        details: error?.message
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Use POST to trigger balance monitor',
    example: {
      method: 'POST',
      path: '/api/balance/trigger-check',
      body: { force_check: true, partner_id: '<optional-partner-uuid>' }
    }
  })
}