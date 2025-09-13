import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking recent balance alerts...')

    // Get recent balance alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('balance_alerts')
      .select(`
        *,
        partners:partner_id (
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent balance history
    const { data: balanceHistory, error: historyError } = await supabase
      .from('mpesa_balance_history')
      .select(`
        *,
        partners:partner_id (
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get Kulman's monitoring config
    const kulmanId = '550e8400-e29b-41d4-a716-446655440000'
    const { data: config, error: configError } = await supabase
      .from('balance_monitoring_config')
      .select('*')
      .eq('partner_id', kulmanId)
      .single()

    return NextResponse.json({
      message: 'Recent alerts and balance data',
      kulman_id: kulmanId,
      recent_alerts: {
        data: alerts,
        error: alertsError,
        count: alerts?.length || 0
      },
      recent_balance_history: {
        data: balanceHistory,
        error: historyError,
        count: balanceHistory?.length || 0
      },
      kulman_config: {
        data: config,
        error: configError
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error checking recent alerts:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
