import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partner_id = searchParams.get('partner_id')

    if (!partner_id) {
      return NextResponse.json(
        { success: false, error: 'partner_id is required' },
        { status: 400 }
      )
    }

    // Get system NCBA settings
    const { data: systemSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'ncba_account_number',
        'ncba_account_reference_separator'
      ])

    if (settingsError || !systemSettings || systemSettings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'System NCBA settings not found' },
        { status: 500 }
      )
    }

    // Convert settings array to object
    const settings = systemSettings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, string>)

    // Verify partner exists
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partner_id)
      .eq('is_active', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found or inactive' },
        { status: 404 }
      )
    }

    // Generate account reference
    const accountReference = `${settings.ncba_account_number}${settings.ncba_account_reference_separator}${partner_id}`

    return NextResponse.json({
      success: true,
      data: {
        partner_id,
        partner_name: partner.name,
        account_reference: accountReference,
        account_number: settings.ncba_account_number,
        separator: settings.ncba_account_reference_separator,
        instructions: {
          paybill_number: '880100',
          account_number: accountReference,
          example: `Paybill: 880100, Account: ${accountReference}`
        }
      }
    })

  } catch (error) {
    console.error('Account Reference GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partner_ids } = body

    if (!partner_ids || !Array.isArray(partner_ids)) {
      return NextResponse.json(
        { success: false, error: 'partner_ids array is required' },
        { status: 400 }
      )
    }

    // Get system NCBA settings
    const { data: systemSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'ncba_account_number',
        'ncba_account_reference_separator'
      ])

    if (settingsError || !systemSettings || systemSettings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'System NCBA settings not found' },
        { status: 500 }
      )
    }

    // Convert settings array to object
    const settings = systemSettings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, string>)

    // Get partners
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name')
      .in('id', partner_ids)
      .eq('is_active', true)

    if (partnersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch partners' },
        { status: 500 }
      )
    }

    // Generate account references for all partners
    const accountReferences = partners.map(partner => ({
      partner_id: partner.id,
      partner_name: partner.name,
      account_reference: `${settings.ncba_account_number}${settings.ncba_account_reference_separator}${partner.id}`,
      account_number: settings.ncba_account_number,
      separator: settings.ncba_account_reference_separator
    }))

    return NextResponse.json({
      success: true,
      data: {
        account_references: accountReferences,
        instructions: {
          paybill_number: '880100',
          example: `Paybill: 880100, Account: ${settings.ncba_account_number}${settings.ncba_account_reference_separator}<PARTNER_ID>`
        }
      }
    })

  } catch (error) {
    console.error('Account Reference POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}



