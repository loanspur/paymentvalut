import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { requirePartner } from '../../../../lib/auth'

// Get partner's shortcodes
export const GET = requirePartner(async (request: NextRequest, user) => {
  try {
    if (!user.partner_id) {
      return NextResponse.json(
        { error: 'Partner ID not found' },
        { status: 400 }
      )
    }

    const { data: shortcodes, error } = await supabase
      .from('partner_shortcodes')
      .select('*')
      .eq('partner_id', user.partner_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch shortcodes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      shortcodes: shortcodes || []
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch shortcodes' },
      { status: 500 }
    )
  }
})

// Create new shortcode for partner
export const POST = requirePartner(async (request: NextRequest, user) => {
  try {
    if (!user.partner_id) {
      return NextResponse.json(
        { error: 'Partner ID not found' },
        { status: 400 }
      )
    }

    const {
      shortcode,
      shortcode_name,
      mpesa_consumer_key,
      mpesa_consumer_secret,
      mpesa_passkey,
      mpesa_initiator_name,
      mpesa_initiator_password,
      mpesa_environment = 'sandbox'
    } = await request.json()

    if (!shortcode || !shortcode_name) {
      return NextResponse.json(
        { error: 'Shortcode and shortcode name are required' },
        { status: 400 }
      )
    }

    // Check if shortcode already exists for this partner
    const { data: existing } = await supabase
      .from('partner_shortcodes')
      .select('id')
      .eq('partner_id', user.partner_id)
      .eq('shortcode', shortcode)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Shortcode already exists for this partner' },
        { status: 400 }
      )
    }

    const { data: newShortcode, error } = await supabase
      .from('partner_shortcodes')
      .insert({
        partner_id: user.partner_id,
        shortcode,
        shortcode_name,
        mpesa_consumer_key,
        mpesa_consumer_secret,
        mpesa_passkey,
        mpesa_initiator_name,
        mpesa_initiator_password,
        mpesa_environment,
        is_mpesa_configured: !!(mpesa_consumer_key && mpesa_consumer_secret),
        is_active: true
      })
      .select()
      .single()

    if (error || !newShortcode) {
      return NextResponse.json(
        { error: 'Failed to create shortcode' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      shortcode: newShortcode
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create shortcode' },
      { status: 500 }
    )
  }
})
