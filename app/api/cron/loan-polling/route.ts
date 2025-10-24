import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting loan polling cron job...')
    
    // Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      console.error('❌ [Cron] Invalid cron secret provided')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [Cron] Missing Supabase configuration')
      return NextResponse.json(
        { success: false, error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    console.log('📡 [Cron] Calling loan-polling Edge Function...')
    
    const response = await fetch(`${supabaseUrl}/functions/v1/loan-polling`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-api-key': supabaseServiceKey
      },
      body: JSON.stringify({})
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ [Cron] Loan polling completed successfully:', result)
      return NextResponse.json({
        success: true,
        message: 'Loan polling completed successfully',
        data: result
      })
    } else {
      console.error('❌ [Cron] Loan polling failed:', result)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Loan polling failed',
          details: result 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ [Cron] Critical error in loan polling cron:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Critical error in loan polling cron',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle GET requests for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Loan Polling Cron Job Endpoint',
    method: 'POST',
    description: 'This endpoint triggers automatic loan polling from Mifos X partners'
  })
}


