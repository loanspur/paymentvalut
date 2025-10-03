import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get webhook delivery status for recent transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const disbursementId = searchParams.get('disbursement_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('webhook_delivery_logs')
      .select(`
        id,
        disbursement_id,
        webhook_url,
        delivery_status,
        http_status_code,
        error_message,
        response_body,
        delivery_attempts,
        created_at,
        updated_at,
        disbursement_requests (
          id,
          origin,
          msisdn,
          amount,
          status,
          conversation_id,
          client_request_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (disbursementId) {
      query = query.eq('disbursement_id', disbursementId)
    }

    const { data: webhookLogs, error } = await query

    if (error) {
      console.error('Error fetching webhook delivery logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch webhook delivery logs' },
        { status: 500 }
      )
    }

    // Get summary statistics
    const { data: allLogs } = await supabase
      .from('webhook_delivery_logs')
      .select('delivery_status')

    const summary = {
      total: allLogs?.length || 0,
      delivered: allLogs?.filter(log => log.delivery_status === 'delivered').length || 0,
      failed: allLogs?.filter(log => log.delivery_status === 'failed').length || 0,
      error: allLogs?.filter(log => log.delivery_status === 'error').length || 0,
      not_configured: allLogs?.filter(log => log.delivery_status === 'not_configured').length || 0,
      not_ussd: allLogs?.filter(log => log.delivery_status === 'not_ussd').length || 0
    }

    return NextResponse.json({
      success: true,
      webhook_logs: webhookLogs || [],
      summary
    })

  } catch (error) {
    console.error('Error in webhook delivery status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

