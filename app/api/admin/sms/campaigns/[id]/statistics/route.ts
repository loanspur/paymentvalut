import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch campaign statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const campaignId = params.id

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get SMS notifications for this campaign - prioritize linked notifications
    const { data: linkedNotifications, error: linkedError } = await supabase
      .from('sms_notifications')
      .select('*')
      .eq('bulk_campaign_id', campaignId)
      .order('created_at', { ascending: false })

    let campaignNotifications = linkedNotifications || []

    // If no linked notifications, try to find by message content and recipients
    if (campaignNotifications.length === 0) {
      const { data: allNotifications, error: notificationsError } = await supabase
        .from('sms_notifications')
        .select('*')
        .eq('partner_id', campaign.partner_id)
        .order('created_at', { ascending: false })

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch SMS notifications' },
          { status: 500 }
        )
      }

      // Filter notifications that match this campaign's message content and recipients
      campaignNotifications = allNotifications?.filter(notif => 
        notif.message_content === campaign.message_content ||
        (campaign.recipient_list && campaign.recipient_list.includes(notif.recipient_phone))
      ) || []
    }

    // Calculate statistics - use campaign data as fallback
    const totalSMS = campaignNotifications.length > 0 ? campaignNotifications.length : (campaign.delivered_count || 0)
    const sentSMS = campaignNotifications.length > 0 
      ? campaignNotifications.filter(n => n.status === 'sent').length 
      : (campaign.delivered_count || 0)
    const failedSMS = campaignNotifications.length > 0 
      ? campaignNotifications.filter(n => n.status === 'failed').length 
      : (campaign.failed_count || 0)
    const pendingSMS = campaignNotifications.length > 0 
      ? campaignNotifications.filter(n => n.status === 'pending').length 
      : 0

    // Calculate success rate
    const successRate = totalSMS > 0 ? (sentSMS / totalSMS) * 100 : 0

    // Calculate total cost - use campaign data as fallback
    const totalCost = campaignNotifications.length > 0 
      ? campaignNotifications.reduce((sum, notif) => sum + (notif.sms_cost || 0), 0)
      : (campaign.total_cost || 0)

    // Get delivery timeline (group by hour)
    const deliveryTimeline = campaignNotifications.reduce((acc, notif) => {
      if (notif.sent_at) {
        const hour = new Date(notif.sent_at).getHours()
        const key = `${hour}:00`
        if (!acc[key]) {
          acc[key] = { sent: 0, failed: 0 }
        }
        if (notif.status === 'sent') {
          acc[key].sent++
        } else if (notif.status === 'failed') {
          acc[key].failed++
        }
      }
      return acc
    }, {} as Record<string, { sent: number; failed: number }>)

    // Get phone number analysis
    const phoneNumbers = campaignNotifications.map(n => n.recipient_phone)
    const uniquePhones = Array.from(new Set(phoneNumbers))

    // Get error analysis
    const errorAnalysis = campaignNotifications
      .filter(n => n.status === 'failed' && n.error_message)
      .reduce((acc, notif) => {
        const error = notif.error_message || 'Unknown error'
        acc[error] = (acc[error] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    // Get recent activity - create from campaign data if no notifications
    const recentActivity = campaignNotifications.length > 0 
      ? campaignNotifications
          .slice(0, 10)
          .map(notif => ({
            phone: notif.recipient_phone,
            status: notif.status,
            message: notif.message_content?.substring(0, 50) + '...',
            timestamp: notif.created_at,
            reference: notif.damza_reference,
            cost: notif.sms_cost || 0
          }))
      : (campaign.recipient_list || []).map(phone => ({
          phone: phone,
          status: 'sent',
          message: campaign.message_content?.substring(0, 50) + '...',
          timestamp: campaign.sent_at || campaign.created_at,
          reference: 'Campaign SMS',
          cost: campaign.total_cost / (campaign.recipient_list?.length || 1)
        }))

    // Prepare statistics data
    const statistics = {
      campaign: {
        id: campaign.id,
        name: campaign.campaign_name,
        partner: campaign.partners?.name,
        status: campaign.status,
        created_at: campaign.created_at,
        sent_at: campaign.sent_at,
        message_content: campaign.message_content,
        total_recipients: campaign.total_recipients || campaign.recipient_list?.length || 0
      },
      overview: {
        total_sms: totalSMS,
        sent_sms: sentSMS,
        failed_sms: failedSMS,
        pending_sms: pendingSMS,
        success_rate: Math.round(successRate * 100) / 100,
        total_cost: totalCost,
        unique_phones: uniquePhones.length,
        insufficient_balance_count: campaign.metadata?.insufficient_balance_count || 0,
        sms_balance_before: campaign.metadata?.sms_balance_before || null,
        sms_balance_after: campaign.metadata?.sms_balance_after || null
      },
      chart_data: {
        success_vs_failed: [
          { name: 'Sent', value: sentSMS, color: '#10B981' },
          { name: 'Failed', value: failedSMS, color: '#EF4444' },
          { name: 'Pending', value: pendingSMS, color: '#F59E0B' }
        ],
        delivery_timeline: Object.entries(deliveryTimeline).map(([hour, data]) => ({
          hour,
          sent: (data as { sent: number; failed: number }).sent,
          failed: (data as { sent: number; failed: number }).failed
        }))
      },
      analysis: {
        error_breakdown: Object.entries(errorAnalysis).map(([error, count]) => ({
          error,
          count
        })),
        insufficient_balance_count: campaign.metadata?.insufficient_balance_count || 0,
        phone_analysis: {
          total_unique: uniquePhones.length,
          duplicates: totalSMS - uniquePhones.length
        }
      },
      recent_activity: recentActivity
    }

    return NextResponse.json({
      success: true,
      data: statistics
    })

  } catch (error) {
    console.error('Campaign Statistics Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
