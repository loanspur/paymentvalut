import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get monitoring alerts for a partner
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unresolved = searchParams.get('unresolved') === 'true'

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('balance_alerts')
      .select(`
        id,
        partner_id,
        alert_type,
        account_type,
        current_balance,
        threshold_balance,
        alert_message,
        slack_sent,
        slack_message_id,
        slack_channel,
        resolved_at,
        created_at
      `)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unresolved) {
      query = query.is('resolved_at', null)
    }

    const { data: alerts, error } = await query

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      )
    }

    // Get partner information
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, short_code')
      .eq('id', partnerId)
      .single()

    if (partnerError) {
      console.error('Error fetching partner:', partnerError)
    }

    // Add partner info to alerts
    const alertsWithPartner = alerts?.map(alert => ({
      ...alert,
      partner: partner || { id: partnerId, name: 'Unknown Partner', short_code: 'N/A' }
    })) || []

    return NextResponse.json({
      success: true,
      alerts: alertsWithPartner
    })

  } catch (error) {
    console.error('Error fetching monitoring alerts:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Resolve an alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alert_id, resolution_notes, resolved_by = 'admin' } = body

    if (!alert_id) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      )
    }

    const { data: updatedAlert, error } = await supabase
      .from('balance_alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by,
        resolution_notes: resolution_notes || null
      })
      .eq('id', alert_id)
      .select()
      .single()

    if (error) {
      console.error('Error resolving alert:', error)
      return NextResponse.json(
        { error: 'Failed to resolve alert' },
        { status: 500 }
      )
    }

    console.log(`✅ Resolved alert ${alert_id}`)

    return NextResponse.json({
      success: true,
      alert: updatedAlert
    })

  } catch (error) {
    console.error('Error resolving alert:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
