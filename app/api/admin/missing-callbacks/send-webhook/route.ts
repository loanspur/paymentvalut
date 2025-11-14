import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-utils'
import { log } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST - Send webhook to USSD team with transaction status
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !(payload as any).userId) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = (payload as any).userId

    // Check if user is super_admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user || user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { transaction_id, conversation_id, originator_conversation_id } = body

    if (!transaction_id && !conversation_id && !originator_conversation_id) {
      return NextResponse.json(
        { error: 'transaction_id, conversation_id, or originator_conversation_id is required' },
        { status: 400 }
      )
    }

    // Get transaction details
    let query = supabase
      .from('disbursement_requests')
      .select(`
        id,
        conversation_id,
        originator_conversation_id,
        client_request_id,
        customer_name,
        customer_id,
        msisdn,
        amount,
        status,
        result_code,
        result_desc,
        transaction_id,
        transaction_receipt,
        partner_id,
        origin,
        created_at,
        updated_at
      `)

    if (transaction_id) {
      query = query.eq('id', transaction_id)
    } else if (conversation_id) {
      query = query.eq('conversation_id', conversation_id)
    } else if (originator_conversation_id) {
      query = query.eq('originator_conversation_id', originator_conversation_id)
    }

    const { data: transaction, error: transactionError } = await query.single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Get latest callback if available
    const { data: callbacks } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .or(`conversation_id.eq.${transaction.conversation_id || ''},originator_conversation_id.eq.${transaction.originator_conversation_id || ''}`)
      .order('created_at', { ascending: false })
      .limit(1)

    const latestCallback = callbacks && callbacks.length > 0 ? callbacks[0] : null

    // Get USSD webhook URL
    const ussdWebhookUrl = process.env.USSD_WEBHOOK_URL

    if (!ussdWebhookUrl) {
      return NextResponse.json(
        { error: 'USSD webhook URL not configured' },
        { status: 500 }
      )
    }

    // Prepare webhook payload
    const webhookPayload = {
      disbursement_id: transaction.id,
      conversation_id: transaction.conversation_id,
      originator_conversation_id: transaction.originator_conversation_id,
      client_request_id: transaction.client_request_id,
      result_code: latestCallback?.result_code || transaction.result_code,
      result_desc: latestCallback?.result_desc || transaction.result_desc,
      transaction_receipt: latestCallback?.receipt_number || transaction.transaction_receipt,
      transaction_id: latestCallback?.transaction_id || transaction.transaction_id,
      amount: transaction.amount,
      msisdn: transaction.msisdn,
      customer_name: transaction.customer_name,
      customer_id: transaction.customer_id,
      status: transaction.status,
      processed_at: new Date().toISOString(),
      has_callback: !!latestCallback,
      callback_received_at: latestCallback?.created_at || null
    }

    log.info('Sending webhook to USSD team', {
      webhook_url: ussdWebhookUrl,
      transaction_id: transaction.id,
      conversation_id: transaction.conversation_id
    })

    // Send webhook
    const webhookResponse = await fetch(ussdWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PaymentVault-Missing-Callbacks/1.0'
      },
      body: JSON.stringify(webhookPayload)
    })

    const webhookResponseText = await webhookResponse.text()
    let webhookResponseData: any = null

    try {
      webhookResponseData = JSON.parse(webhookResponseText)
    } catch (error) {
      // Response might not be JSON
      webhookResponseData = { message: webhookResponseText }
    }

    if (!webhookResponse.ok) {
      log.error('Webhook delivery failed', {
        status: webhookResponse.status,
        response: webhookResponseData
      })

      return NextResponse.json({
        success: false,
        error: 'Failed to deliver webhook',
        webhook_status: webhookResponse.status,
        webhook_response: webhookResponseData
      }, { status: 500 })
    }

    log.info('Webhook delivered successfully', {
      transaction_id: transaction.id,
      webhook_status: webhookResponse.status
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook sent successfully to USSD team',
      transaction: {
        id: transaction.id,
        conversation_id: transaction.conversation_id,
        originator_conversation_id: transaction.originator_conversation_id,
        status: transaction.status
      },
      webhook: {
        url: ussdWebhookUrl,
        status: webhookResponse.status,
        response: webhookResponseData
      },
      payload: webhookPayload
    })

  } catch (error) {
    log.error('Error sending webhook to USSD team', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

