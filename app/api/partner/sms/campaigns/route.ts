import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'
import { calculateSMSCost } from '@/lib/sms-utils'
import { log } from '../../../../../lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch SMS campaigns for the logged-in partner
export async function GET(request: NextRequest) {
  try {
    // Authentication check
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
      log.error('Error fetching user for partner campaigns', userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Only allow partner_admin and regular users with partner_id
    if (user.role !== 'partner_admin' && !user.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Partner access required' },
        { status: 403 }
      )
    }

    const partnerId = user.partner_id

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Query SMS campaigns for this partner only
    let query = supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code,
          is_active
        )
      `)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      log.error('Error fetching partner SMS campaigns', error)
      
      if (error.message && error.message.includes('relation "sms_bulk_campaigns" does not exist')) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'SMS tables not initialized. Please contact administrator.'
        })
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch SMS campaigns' },
        { status: 500 }
      )
    }

    // Update campaign statuses based on SMS notifications
    if (data && data.length > 0) {
      const sendingCampaigns = data.filter((c: any) => c.status === 'sending')
      
      for (const campaign of sendingCampaigns) {
        const { data: notifications } = await supabase
          .from('sms_notifications')
          .select('status')
          .eq('bulk_campaign_id', campaign.id)

        if (notifications && notifications.length > 0) {
          const sentCount = notifications.filter((n: any) => n.status === 'sent' || n.status === 'delivered').length
          const failedCount = notifications.filter((n: any) => n.status === 'failed').length
          const pendingCount = notifications.filter((n: any) => n.status === 'pending').length
          const totalCount = notifications.length

          let campaignStatus = 'sending'
          if (pendingCount === 0 && totalCount > 0) {
            campaignStatus = sentCount > 0 ? 'completed' : 'failed'
          }

          if (campaign.status !== campaignStatus) {
            await supabase
              .from('sms_bulk_campaigns')
              .update({
                status: campaignStatus,
                delivered_count: sentCount,
                failed_count: failedCount,
                sent_count: totalCount
              })
              .eq('id', campaign.id)

            campaign.status = campaignStatus
            campaign.delivered_count = sentCount
            campaign.failed_count = failedCount
            campaign.sent_count = totalCount
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    log.error('Partner SMS Campaigns GET Error', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new SMS campaign for the logged-in partner
export async function POST(request: NextRequest) {
  try {
    // Authentication check
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
      log.error('Error fetching user for partner campaign creation', userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Only allow partner_admin and regular users with partner_id
    if (user.role !== 'partner_admin' && !user.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Partner access required' },
        { status: 403 }
      )
    }

    const partnerId = user.partner_id

    const body = await request.json()
    const {
      campaign_name,
      template_id,
      message_content,
      recipient_list,
      scheduled_at,
      status = 'draft',
      csv_data,
      merge_fields
    } = body

    // Validate required fields
    if (!campaign_name || !message_content || !recipient_list || recipient_list.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: campaign_name, message_content, recipient_list' },
        { status: 400 }
      )
    }

    // Get super admin SMS settings for cost calculation
    // Use default cost or system settings
    const costPerSMS = 1 // Default cost, can be configured via system settings
    const costPerMessage = calculateSMSCost(message_content, costPerSMS)
    const totalRecipients = recipient_list.length
    const estimatedCost = totalRecipients * costPerMessage

    // Create campaign (automatically uses partner_id from user)
    const { data, error } = await supabase
      .from('sms_bulk_campaigns')
      .insert({
        partner_id: partnerId,
        campaign_name,
        template_id: template_id || null,
        message_content,
        recipient_list: recipient_list,
        total_recipients: totalRecipients,
        total_cost: estimatedCost,
        status,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
        created_by: userId,
        csv_data: csv_data || null,
        merge_fields: merge_fields || null
      })
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code,
          is_active
        )
      `)
      .single()

    if (error) {
      log.error('Error creating partner SMS campaign', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create SMS campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'SMS campaign created successfully'
    })

  } catch (error) {
    log.error('Partner SMS Campaigns POST Error', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

