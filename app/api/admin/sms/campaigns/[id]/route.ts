import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch specific SMS campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code,
          is_active
        ),
        sms_templates:template_id (
          id,
          template_name,
          template_content,
          template_type
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching SMS campaign:', error)
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('SMS Campaign GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update SMS campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      campaign_name,
      template_id,
      message_content,
      recipient_list,
      scheduled_at,
      status
    } = body

    // Calculate updated recipients and cost if recipient_list changed
    let updateData: any = {
      campaign_name,
      template_id: template_id || null,
      message_content,
      scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      status
    }

    if (recipient_list && recipient_list.length > 0) {
      updateData.recipient_list = recipient_list
      updateData.total_recipients = recipient_list.length
      updateData.total_cost = recipient_list.length * 0.50 // Assuming 0.50 KES per SMS
    }

    const { data, error } = await supabase
      .from('sms_bulk_campaigns')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code,
          is_active
        ),
        sms_templates:template_id (
          id,
          template_name,
          template_content,
          template_type
        )
      `)
      .single()

    if (error) {
      console.error('Error updating SMS campaign:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update SMS campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'SMS campaign updated successfully'
    })

  } catch (error) {
    console.error('SMS Campaign PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete SMS campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { error } = await supabase
      .from('sms_bulk_campaigns')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting SMS campaign:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete SMS campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMS campaign deleted successfully'
    })

  } catch (error) {
    console.error('SMS Campaign DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
