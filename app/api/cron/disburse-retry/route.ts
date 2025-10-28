import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting automatic disbursement retry process...')
    
    // Verify this is a legitimate cron request from Vercel
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ [Cron] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the disburse-retry Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/disburse-retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({})
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ [Cron] Retry process completed successfully')
      console.log(`   Retry count: ${result.retry_count}`)
      console.log(`   Success count: ${result.success_count}`)
      console.log(`   Failure count: ${result.failure_count}`)
      
      return NextResponse.json({
        success: true,
        message: 'Automatic retry process completed',
        timestamp: new Date().toISOString(),
        result
      })
    } else {
      console.error('❌ [Cron] Retry process failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [Cron] Critical error in retry process:', error)
    return NextResponse.json({
      success: false,
      error: 'Critical error in retry process',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}








