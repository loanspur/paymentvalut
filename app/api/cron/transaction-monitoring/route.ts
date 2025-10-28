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

    // Trigger the balance-monitor Edge Function asynchronously (fire-and-forget)
    // This avoids timeout issues with cron-job.org's 30s limit
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/balance-monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ force_check: true })
    }).then(async (response) => {
      const result = await response.json()
      if (response.ok) {
        console.log('✅ [Cron] Balance monitoring triggered successfully')
        console.log(`   Partners to be checked: ${result.results?.length || 0}`)
      } else {
        console.error('❌ [Cron] Balance monitoring trigger failed:', result.error)
      }
    }).catch((error) => {
      console.error('❌ [Cron] Error triggering balance monitoring:', error)
    })

    // Return immediately to avoid cron-job.org timeout
    console.log('🔄 [Cron] Balance monitoring triggered (running in background)')
    
    return NextResponse.json({
      success: true,
      message: 'Balance monitoring triggered successfully',
      timestamp: new Date().toISOString(),
      note: 'Balance check is running in background. Check Supabase logs for detailed results.'
    })

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

