import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { requirePartner } from '../../../../../lib/auth-utils'


// Get specific shortcode
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requirePartner(async (req, user) => {
    try {
      if (!user.partner_id) {
        return NextResponse.json(
          { error: 'Partner ID not found' },
          { status: 400 }
        )
      }

      const { data: shortcode, error } = await supabase
        .from('partner_shortcodes')
        .select('*')
        .eq('id', params.id)
        .eq('partner_id', user.partner_id)
        .single()

      if (error || !shortcode) {
        return NextResponse.json(
          { error: 'Shortcode not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        shortcode
      })

    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch shortcode' },
        { status: 500 }
      )
    }
  })(request)
}

// Update shortcode
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requirePartner(async (req, user) => {
    try {
      if (!user.partner_id) {
        return NextResponse.json(
          { error: 'Partner ID not found' },
          { status: 400 }
        )
      }

      const updates = await request.json()

      // Remove fields that shouldn't be updated directly
      delete updates.id
      delete updates.partner_id
      delete updates.created_at

      // Check if shortcode exists and belongs to user's partner
      const { data: existing } = await supabase
        .from('partner_shortcodes')
        .select('id')
        .eq('id', params.id)
        .eq('partner_id', user.partner_id)
        .single()

      if (!existing) {
        return NextResponse.json(
          { error: 'Shortcode not found' },
          { status: 404 }
        )
      }

      // If updating shortcode value, check for duplicates
      if (updates.shortcode) {
        const { data: duplicate } = await supabase
          .from('partner_shortcodes')
          .select('id')
          .eq('partner_id', user.partner_id)
          .eq('shortcode', updates.shortcode)
          .neq('id', params.id)
          .single()

        if (duplicate) {
          return NextResponse.json(
            { error: 'Shortcode already exists for this partner' },
            { status: 400 }
          )
        }
      }

      // Update M-Pesa configuration status
      if (updates.mpesa_consumer_key && updates.mpesa_consumer_secret) {
        updates.is_mpesa_configured = true
      }

      const { data: updatedShortcode, error } = await supabase
        .from('partner_shortcodes')
        .update(updates)
        .eq('id', params.id)
        .eq('partner_id', user.partner_id)
        .select()
        .single()

      if (error || !updatedShortcode) {
        return NextResponse.json(
          { error: 'Failed to update shortcode' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        shortcode: updatedShortcode
      })

    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to update shortcode' },
        { status: 500 }
      )
    }
  })(request)
}

// Delete shortcode
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requirePartner(async (req, user) => {
    try {
      if (!user.partner_id) {
        return NextResponse.json(
          { error: 'Partner ID not found' },
          { status: 400 }
        )
      }

      // Check if shortcode exists and belongs to user's partner
      const { data: existing } = await supabase
        .from('partner_shortcodes')
        .select('id')
        .eq('id', params.id)
        .eq('partner_id', user.partner_id)
        .single()

      if (!existing) {
        return NextResponse.json(
          { error: 'Shortcode not found' },
          { status: 404 }
        )
      }

      const { error } = await supabase
        .from('partner_shortcodes')
        .delete()
        .eq('id', params.id)
        .eq('partner_id', user.partner_id)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to delete shortcode' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Shortcode deleted successfully'
      })

    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to delete shortcode' },
        { status: 500 }
      )
    }
  })(request)
}
