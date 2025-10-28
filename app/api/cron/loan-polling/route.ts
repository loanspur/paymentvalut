import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting automatic loan polling process...')
    
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

    // Call the loan-polling Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/loan-polling`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({})
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ [Cron] Loan polling completed successfully')
      console.log(`   Partners checked: ${result.partners_checked}`)
      console.log(`   Loans found: ${result.loans_found}`)
      console.log(`   Loans processed: ${result.loans_processed}`)
      
      return NextResponse.json({
        success: true,
        message: 'Loan polling process completed',
        timestamp: new Date().toISOString(),
        result
      })
    } else {
      console.error('❌ [Cron] Loan polling failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [Cron] Critical error in loan polling process:', error)
    return NextResponse.json({
      success: false,
      error: 'Critical error in loan polling process',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support POST requests as well for cron-job.org compatibility
export async function POST(request: NextRequest) {
  return GET(request)
}
