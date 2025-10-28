import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get OTP configuration status
export async function GET(request: NextRequest) {
  try {
    const { data: otpSettings, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, setting_type, description')
      .eq('setting_key', 'login_otp_enabled')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching OTP settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch OTP settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      otp_enabled: otpSettings?.setting_value === 'true' || false,
      settings: otpSettings || null
    })

  } catch (error) {
    console.error('OTP config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Configure OTP settings
export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json()

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean value' },
        { status: 400 }
      )
    }

    // Insert or update OTP settings
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'login_otp_enabled',
        setting_value: enabled.toString(),
        setting_type: 'boolean',
        description: 'Enable OTP login verification system',
        is_encrypted: false
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating OTP settings:', error)
      return NextResponse.json(
        { error: 'Failed to update OTP settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `OTP login ${enabled ? 'enabled' : 'disabled'} successfully`,
      settings: data
    })

  } catch (error) {
    console.error('OTP config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

