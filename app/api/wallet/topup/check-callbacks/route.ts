import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Diagnostic endpoint to check recent STK push transactions and callback status
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const amount = searchParams.get('amount') // Filter by amount (e.g., "10" for KES 10)

    // Get recent STK push logs
    let query = supabase
      .from('ncb_stk_push_logs')
      .select(`
        id,
        partner_id,
        wallet_transaction_id,
        stk_push_transaction_id,
        partner_phone,
        amount,
        stk_push_status,
        ncb_response,
        ncb_receipt_number,
        created_at,
        updated_at,
        wallet_transaction:wallet_transactions(
          id,
          status,
          amount,
          transaction_type,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by amount if provided
    if (amount) {
      query = query.eq('amount', parseFloat(amount))
    }

    const { data: stkPushLogs, error } = await query

    if (error) {
      console.error('Error fetching STK push logs:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch STK push logs' },
        { status: 500 }
      )
    }

    // Format response with callback status
    const formattedLogs = stkPushLogs?.map(log => ({
      id: log.id,
      stk_push_transaction_id: log.stk_push_transaction_id,
      amount: log.amount,
      phone: log.partner_phone,
      stk_push_status: log.stk_push_status,
      callback_received: !!log.ncb_response,
      callback_data: log.ncb_response ? {
        has_data: true,
        keys: Object.keys(log.ncb_response as any)
      } : null,
      receipt_number: log.ncb_receipt_number,
      created_at: log.created_at,
      updated_at: log.updated_at,
      wallet_transaction: log.wallet_transaction && Array.isArray(log.wallet_transaction) && log.wallet_transaction.length > 0 ? {
        id: log.wallet_transaction[0].id,
        status: log.wallet_transaction[0].status,
        amount: log.wallet_transaction[0].amount
      } : null,
      time_since_created: log.created_at 
        ? Math.round((Date.now() - new Date(log.created_at).getTime()) / 1000 / 60) + ' minutes ago'
        : null
    })) || []

    // Summary statistics
    const total = formattedLogs.length
    const withCallbacks = formattedLogs.filter(log => log.callback_received).length
    const withoutCallbacks = total - withCallbacks
    const completed = formattedLogs.filter(log => log.stk_push_status === 'completed').length
    const pending = formattedLogs.filter(log => log.stk_push_status === 'initiated' || log.stk_push_status === 'pending').length

    return NextResponse.json({
      success: true,
      summary: {
        total,
        with_callbacks: withCallbacks,
        without_callbacks: withoutCallbacks,
        completed,
        pending,
        failed: total - completed - pending
      },
      recent_transactions: formattedLogs,
      note: 'Check "callback_received" field to see if NCBA sent a callback. If false, the callback was not received.'
    })

  } catch (error) {
    console.error('Check Callbacks Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

