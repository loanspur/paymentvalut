import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { requirePartner } from '../../../../lib/auth'

// Get partner's disbursements
export const GET = requirePartner(async (request: NextRequest, user) => {
  try {
    if (!user.partner_id) {
      return NextResponse.json(
        { error: 'Partner ID not found' },
        { status: 400 }
      )
    }

    const { data: disbursements, error } = await supabase
      .from('disbursement_requests')
      .select(`
        id,
        amount,
        msisdn,
        status,
        created_at,
        updated_at,
        partner_shortcodes (
          shortcode,
          shortcode_name
        )
      `)
      .eq('partner_id', user.partner_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch disbursements' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      disbursements: disbursements || []
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch disbursements' },
      { status: 500 }
    )
  }
})
