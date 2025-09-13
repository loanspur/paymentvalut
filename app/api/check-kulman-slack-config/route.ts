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
    console.log('🔍 Checking Kulman Slack configuration...')

    // Check both possible tables for monitoring configs
    const kulmanId = '550e8400-e29b-41d4-a716-446655440000'

    // Check balance_monitoring_config table
    const { data: balanceConfig, error: balanceError } = await supabase
      .from('balance_monitoring_config')
      .select('*')
      .eq('partner_id', kulmanId)

    // Check partner_balance_configs table
    const { data: partnerConfig, error: partnerError } = await supabase
      .from('partner_balance_configs')
      .select('*')
      .eq('partner_id', kulmanId)

    // Get Kulman partner details
    const { data: partner, error: partnerDetailsError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', kulmanId)
      .single()

    return NextResponse.json({
      message: 'Kulman Slack configuration check',
      kulman_id: kulmanId,
      partner_details: partner,
      balance_monitoring_config: {
        data: balanceConfig,
        error: balanceError,
        exists: !balanceError || balanceError.code !== 'PGRST205'
      },
      partner_balance_configs: {
        data: partnerConfig,
        error: partnerError,
        exists: !partnerError || partnerError.code !== 'PGRST205'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error checking Kulman Slack config:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
