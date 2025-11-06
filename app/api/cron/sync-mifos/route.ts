import { NextRequest, NextResponse } from 'next/server'
import { incrementalSync } from '../../../../scripts/sync_mifos_to_supabase'

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('Starting incremental Mifos sync...')
    
    // Run incremental sync
    await incrementalSync()
    
    return NextResponse.json({
      success: true,
      message: 'Incremental sync completed',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Mifos sync error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

