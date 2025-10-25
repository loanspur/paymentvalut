import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all SMS campaigns
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')
    const status = searchParams.get('status')

    // Try to query SMS campaigns directly - if table doesn't exist, it will error

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
      .order('created_at', { ascending: false })

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching SMS campaigns:', error)
      
      // Check if it's a table doesn't exist error
      if (error.message && error.message.includes('relation "sms_bulk_campaigns" does not exist')) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'SMS tables not initialized. Please run the database migration.'
        })
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch SMS campaigns' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('SMS Campaigns GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new SMS campaign
export async function POST(request: NextRequest) {
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
      partner_id,
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
    if (!partner_id || !campaign_name || !message_content || !recipient_list || recipient_list.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get partner SMS settings to calculate correct cost
    const { data: smsSettings, error: smsSettingsError } = await supabase
      .from('partner_sms_settings')
      .select('sms_charge_per_message')
      .eq('partner_id', partner_id)
      .single()

    if (smsSettingsError) {
      console.error('Error fetching SMS settings for cost calculation:', smsSettingsError)
    }

    // Calculate total recipients and estimated cost
    const totalRecipients = recipient_list.length
    const costPerSMS = smsSettings?.sms_charge_per_message || 1 // Use partner's cost or default
    const estimatedCost = totalRecipients * costPerSMS

    // Get the user ID from the JWT payload
    const userId = payload.userId || payload.sub || payload.id
    
    // Create campaign
    const { data, error } = await supabase
      .from('sms_bulk_campaigns')
      .insert({
        partner_id,
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
      .maybeSingle()

    if (error) {
      console.error('Error creating SMS campaign:', error)
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
    console.error('SMS Campaigns POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
