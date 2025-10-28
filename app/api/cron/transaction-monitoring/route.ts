import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting balance monitoring process...')
    
    // Verify this is a legitimate cron request from cron-job.org
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('❌ [Cron] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ [Cron] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the balance-monitor Edge Function for real-time B2C balance monitoring
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/balance-monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ force_check: true })
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ [Cron] Balance monitoring completed successfully')
      console.log(`   Partners checked: ${result.results?.length || 0}`)
      console.log(`   Monitoring configs: ${result.configs_processed || 0}`)
      
      return NextResponse.json({
        success: true,
        message: 'Balance monitoring completed',
        timestamp: new Date().toISOString(),
        result
      })
    } else {
      console.error('❌ [Cron] Balance monitoring failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        details: result.details,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [Cron] Critical error in balance monitoring:', error)
    return NextResponse.json({
      success: false,
      error: 'Critical error in balance monitoring',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support POST requests as well for cron-job.org compatibility
export async function POST(request: NextRequest) {
  return GET(request)
}

