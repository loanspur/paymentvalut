import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get monitoring configuration for a partner
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Try to get from balance_monitoring_config first (newer schema)
    const { data: newConfig, error: newConfigError } = await supabase
      .from('balance_monitoring_config')
      .select('*')
      .eq('partner_id', partnerId)
      .single()

    if (newConfig && !newConfigError) {
      return NextResponse.json({
        success: true,
        config: newConfig
      })
    }

    // Fallback to partner_balance_configs (legacy schema)
    const { data: legacyConfig, error: legacyConfigError } = await supabase
      .from('partner_balance_configs')
      .select('*')
      .eq('partner_id', partnerId)
      .single()

    if (legacyConfig && !legacyConfigError) {
      return NextResponse.json({
        success: true,
        config: {
          id: legacyConfig.id,
          partner_id: legacyConfig.partner_id,
          working_account_threshold: legacyConfig.low_balance_threshold,
          utility_account_threshold: 500.00, // Default
          charges_account_threshold: 200.00, // Default
          check_interval_minutes: legacyConfig.check_interval_minutes,
          slack_webhook_url: legacyConfig.slack_webhook_url,
          slack_channel: legacyConfig.slack_channel,
          is_enabled: legacyConfig.is_monitoring_enabled,
          last_checked_at: null,
          last_alert_sent_at: null,
          created_at: legacyConfig.created_at,
          updated_at: legacyConfig.updated_at
        }
      })
    }

    // Return default configuration if none exists
    return NextResponse.json({
      success: true,
      config: {
        id: null,
        partner_id: partnerId,
        working_account_threshold: 1000.00,
        utility_account_threshold: 500.00,
        charges_account_threshold: 200.00,
        variance_drop_threshold: 5000.00,
        check_interval_minutes: 15,
        slack_webhook_url: '',
        slack_channel: '#mpesa-alerts',
        is_enabled: true,
        last_checked_at: null,
        last_alert_sent_at: null,
        created_at: null,
        updated_at: null
      }
    })

  } catch (error) {
    console.error('Error fetching monitoring config:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Update monitoring configuration for a partner
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      partner_id,
      working_account_threshold,
      utility_account_threshold,
      charges_account_threshold,
      variance_drop_threshold,
      check_interval_minutes,
      slack_webhook_url,
      slack_channel,
      is_enabled
    } = body

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Validate thresholds
    if (working_account_threshold < 0 || utility_account_threshold < 0 || charges_account_threshold < 0) {
      return NextResponse.json(
        { error: 'Thresholds must be positive numbers' },
        { status: 400 }
      )
    }

    // Validate variance drop threshold
    if (variance_drop_threshold && variance_drop_threshold < 1) {
      return NextResponse.json(
        { error: 'Variance drop threshold must be at least 1 KES' },
        { status: 400 }
      )
    }

    if (check_interval_minutes < 5 || check_interval_minutes > 1440) {
      return NextResponse.json(
        { error: 'Check interval must be between 5 and 1440 minutes' },
        { status: 400 }
      )
    }

    // Validate Slack webhook URL if provided
    if (slack_webhook_url && !slack_webhook_url.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL format' },
        { status: 400 }
      )
    }

    const configData = {
      partner_id,
      working_account_threshold: parseFloat(working_account_threshold),
      utility_account_threshold: parseFloat(utility_account_threshold),
      charges_account_threshold: parseFloat(charges_account_threshold),
      variance_drop_threshold: variance_drop_threshold ? parseFloat(variance_drop_threshold) : 5000.00,
      check_interval_minutes: parseInt(check_interval_minutes),
      slack_webhook_url: slack_webhook_url || null,
      slack_channel: slack_channel || '#mpesa-alerts',
      is_enabled: Boolean(is_enabled),
      updated_at: new Date().toISOString()
    }

    // Try to update in balance_monitoring_config first
    const { data: updatedConfig, error: updateError } = await supabase
      .from('balance_monitoring_config')
      .upsert(configData, { onConflict: 'partner_id' })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating monitoring config:', updateError)
      return NextResponse.json(
        { error: 'Failed to update monitoring configuration' },
        { status: 500 }
      )
    }

    console.log(`✅ Updated monitoring config for partner ${partner_id}`)

    return NextResponse.json({
      success: true,
      config: updatedConfig
    })

  } catch (error) {
    console.error('Error updating monitoring config:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
