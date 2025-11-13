import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-utils'
import { calculateSMSCost } from '@/lib/sms-utils'
import { log } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to update campaign status based on actual SMS notifications
async function updateCampaignStatusFromNotifications(campaignId: string) {
  const { data: notifications, error: notifError } = await supabase
    .from('sms_notifications')
    .select('status')
    .eq('bulk_campaign_id', campaignId)

  if (notifError || !notifications || notifications.length === 0) {
    return null
  }

  const sentCount = notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length
  const failedCount = notifications.filter(n => n.status === 'failed').length
  const pendingCount = notifications.filter(n => n.status === 'pending').length
  const totalCount = notifications.length

  let campaignStatus = 'sending'
  if (pendingCount === 0 && totalCount > 0) {
    campaignStatus = sentCount > 0 ? 'completed' : 'failed'
  }

  const { data: campaign } = await supabase
    .from('sms_bulk_campaigns')
    .select('status')
    .eq('id', campaignId)
    .single()

  if (campaign && campaign.status !== campaignStatus) {
    await supabase
      .from('sms_bulk_campaigns')
      .update({
        status: campaignStatus,
        delivered_count: sentCount,
        failed_count: failedCount,
        sent_count: totalCount
      })
      .eq('id', campaignId)
  }

  return {
    status: campaignStatus,
    sent_count: sentCount,
    failed_count: failedCount,
    pending_count: pendingCount,
    total_count: totalCount
  }
}

// GET - Fetch specific SMS campaign (partner version)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !(payload as any).userId) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = (payload as any).userId

    // Get user's partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      log.error('Error fetching user for partner campaign', userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'partner_admin' && !user.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Partner access required' },
        { status: 403 }
      )
    }

    const partnerId = user.partner_id

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
      .eq('partner_id', partnerId) // Ensure campaign belongs to partner
      .single()

    if (error || !data) {
      log.error('Error fetching partner SMS campaign', error)
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Update status if sending
    if (data.status === 'sending') {
      const statusUpdate = await updateCampaignStatusFromNotifications(params.id)
      if (statusUpdate) {
        const { data: updatedCampaign } = await supabase
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
          .eq('partner_id', partnerId)
          .single()

        if (updatedCampaign) {
          return NextResponse.json({
            success: true,
            data: updatedCampaign
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    log.error('Partner SMS Campaign GET Error', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update SMS campaign (partner version)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !(payload as any).userId) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = (payload as any).userId

    // Get user's partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      log.error('Error fetching user for partner campaign update', userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'partner_admin' && !user.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Partner access required' },
        { status: 403 }
      )
    }

    const partnerId = user.partner_id

    // Verify campaign belongs to partner
    const { data: existingCampaign } = await supabase
      .from('sms_bulk_campaigns')
      .select('id, status, partner_id')
      .eq('id', params.id)
      .single()

    if (!existingCampaign || existingCampaign.partner_id !== partnerId) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    // Only allow updates to draft campaigns
    if (existingCampaign.status !== 'draft' && existingCampaign.status !== 'scheduled') {
      return NextResponse.json(
        { success: false, error: 'Can only update draft or scheduled campaigns' },
        { status: 400 }
      )
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
      const costPerSMS = 1 // Default cost
      const costPerMessage = calculateSMSCost(message_content, costPerSMS)
      updateData.total_cost = recipient_list.length * costPerMessage
    }

    const { data, error } = await supabase
      .from('sms_bulk_campaigns')
      .update(updateData)
      .eq('id', params.id)
      .eq('partner_id', partnerId) // Ensure partner ownership
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
      log.error('Error updating partner SMS campaign', error)
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
    log.error('Partner SMS Campaign PUT Error', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete SMS campaign (partner version)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !(payload as any).userId) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = (payload as any).userId

    // Get user's partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      log.error('Error fetching user for partner campaign delete', userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'partner_admin' && !user.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Partner access required' },
        { status: 403 }
      )
    }

    const partnerId = user.partner_id

    // Verify campaign belongs to partner and is in deletable status
    const { data: existingCampaign } = await supabase
      .from('sms_bulk_campaigns')
      .select('id, status, partner_id')
      .eq('id', params.id)
      .single()

    if (!existingCampaign || existingCampaign.partner_id !== partnerId) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    // Only allow deletion of draft or failed campaigns
    if (existingCampaign.status !== 'draft' && existingCampaign.status !== 'failed') {
      return NextResponse.json(
        { success: false, error: 'Can only delete draft or failed campaigns' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('sms_bulk_campaigns')
      .delete()
      .eq('id', params.id)
      .eq('partner_id', partnerId) // Ensure partner ownership

    if (error) {
      log.error('Error deleting partner SMS campaign', error)
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
    log.error('Partner SMS Campaign DELETE Error', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

