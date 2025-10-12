import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_VALUES } from '../../../../lib/constants'

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
          utility_account_threshold: DEFAULT_VALUES.MONITORING.UTILITY_ACCOUNT_THRESHOLD,
          charges_account_threshold: DEFAULT_VALUES.MONITORING.CHARGES_ACCOUNT_THRESHOLD,
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
        working_account_threshold: DEFAULT_VALUES.MONITORING.WORKING_ACCOUNT_THRESHOLD,
        utility_account_threshold: DEFAULT_VALUES.MONITORING.UTILITY_ACCOUNT_THRESHOLD,
        charges_account_threshold: DEFAULT_VALUES.MONITORING.CHARGES_ACCOUNT_THRESHOLD,
        variance_drop_threshold: DEFAULT_VALUES.MONITORING.VARIANCE_DROP_THRESHOLD,
        check_interval_minutes: DEFAULT_VALUES.MONITORING.CHECK_INTERVAL_MINUTES,
        slack_webhook_url: '',
        slack_channel: DEFAULT_VALUES.MONITORING.SLACK_CHANNEL,
        is_enabled: true,
        last_checked_at: null,
        last_alert_sent_at: null,
        created_at: null,
        updated_at: null
      }
    })

  } catch (error) {
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

    // Processing config update request

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Validate thresholds
    if (working_account_threshold === undefined || working_account_threshold < 0) {
      return NextResponse.json(
        { error: 'Working account threshold must be a positive number' },
        { status: 400 }
      )
    }
    
    if (utility_account_threshold === undefined || utility_account_threshold < 0) {
      return NextResponse.json(
        { error: 'Utility account threshold must be a positive number' },
        { status: 400 }
      )
    }
    
    if (charges_account_threshold === undefined || charges_account_threshold < 0) {
      return NextResponse.json(
        { error: 'Charges account threshold must be a positive number' },
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

    const configData: any = {
      partner_id,
      working_account_threshold: parseFloat(working_account_threshold),
      utility_account_threshold: parseFloat(utility_account_threshold),
      charges_account_threshold: parseFloat(charges_account_threshold),
      check_interval_minutes: parseInt(check_interval_minutes),
      slack_webhook_url: slack_webhook_url || null,
      slack_channel: slack_channel || '#mpesa-alerts',
      is_enabled: Boolean(is_enabled),
      updated_at: new Date().toISOString()
    }

    // Only add variance_drop_threshold if it's provided and the column exists
    if (variance_drop_threshold) {
      configData.variance_drop_threshold = parseFloat(variance_drop_threshold)
    }

    // Try to update in balance_monitoring_config first
    const { data: updatedConfig, error: updateError } = await supabase
      .from('balance_monitoring_config')
      .upsert(configData, { onConflict: 'partner_id' })
      .select()
      .single()

    if (updateError) {
      
      // Provide more helpful error messages for common constraint violations
      let errorMessage = 'Failed to update monitoring configuration'
      if (updateError.message.includes('variance_drop_threshold_range')) {
        errorMessage = 'Variance drop threshold is outside the allowed range. Please contact support to fix the database constraint.'
      } else if (updateError.message.includes('variance_drop_threshold_min')) {
        errorMessage = 'Variance drop threshold must be at least 1 KES'
      } else if (updateError.message.includes('check constraint')) {
        errorMessage = 'One or more values violate database constraints. Please check your input values.'
      } else if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        errorMessage = 'Database schema issue detected. Please run the latest migration to add missing columns.'
      } else if (updateError.message.includes('foreign key')) {
        errorMessage = 'Invalid partner ID provided.'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: updateError.message,
          configData: configData,
          errorCode: updateError.code
        },
        { status: 500 }
      )
    }

    // Monitoring config updated successfully

    return NextResponse.json({
      success: true,
      config: updatedConfig
    })

  } catch (error) {
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
