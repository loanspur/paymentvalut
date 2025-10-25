import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // e.g., 'ncba', 'general'

    let query = supabase
      .from('system_settings')
      .select('*')
      .order('setting_key')

    if (category) {
      query = query.like('setting_key', `${category}_%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching system settings:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch system settings' },
        { status: 500 }
      )
    }

    // Convert array to object for easier access
    const settings = data?.reduce((acc, setting) => {
      acc[setting.setting_key] = {
        value: setting.setting_value,
        type: setting.setting_type,
        description: setting.description,
        is_encrypted: setting.is_encrypted
      }
      return acc
    }, {} as Record<string, any>) || {}

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('System Settings GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Settings object is required' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: key,
            setting_value: String(value),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          })
          .select()

        if (error) {
          errors.push({ key, error: error.message })
        } else {
          results.push({ key, success: true })
        }
      } catch (err) {
        errors.push({ key, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Some settings failed to update',
        details: errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: results
    })

  } catch (error) {
    console.error('System Settings POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}



