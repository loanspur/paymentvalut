import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { requirePartner } from '../../../../lib/auth-utils'


interface DisburseRequest {
  amount: number
  msisdn: string
  tenant_id: string
  customer_id: string
  client_request_id: string
  shortcode_id: string
}

// Create disbursement for partner
export const POST = requirePartner(async (request: NextRequest, user) => {
  try {
    if (!user.partner_id) {
      return NextResponse.json(
        { error: 'Partner ID not found' },
        { status: 400 }
      )
    }

    const body: DisburseRequest = await request.json()

    // Validate request
    if (!body.amount || !body.msisdn || !body.tenant_id || !body.customer_id || !body.client_request_id || !body.shortcode_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate MSISDN format (Kenyan format)
    const msisdnRegex = /^254[0-9]{9}$/
    if (!msisdnRegex.test(body.msisdn)) {
      return NextResponse.json(
        { error: 'Invalid MSISDN format. Use format: 254XXXXXXXXX' },
        { status: 400 }
      )
    }

    // Validate amount
    if (body.amount <= 0 || body.amount > 150000) {
      return NextResponse.json(
        { error: 'Amount must be between 1 and 150,000 KES' },
        { status: 400 }
      )
    }

    // Check if shortcode belongs to partner
    const { data: shortcode, error: shortcodeError } = await supabase
      .from('partner_shortcodes')
      .select('*')
      .eq('id', body.shortcode_id)
      .eq('partner_id', user.partner_id)
      .eq('is_active', true)
      .single()

    if (shortcodeError || !shortcode) {
      return NextResponse.json(
        { error: 'Shortcode not found or not accessible' },
        { status: 404 }
      )
    }

    if (!shortcode.is_mpesa_configured) {
      return NextResponse.json(
        { error: 'M-Pesa not configured for this shortcode' },
        { status: 400 }
      )
    }

    // Check for duplicate request (idempotency)
    const { data: existingRequest } = await supabase
      .from('disbursement_requests')
      .select('id, status, conversation_id')
      .eq('client_request_id', body.client_request_id)
      .eq('partner_id', user.partner_id)
      .single()

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        disbursement_id: existingRequest.id,
        conversation_id: existingRequest.conversation_id,
        status: existingRequest.status,
        message: 'Request already exists'
      })
    }

    // Create disbursement request
    const { data: disbursementRequest, error: dbError } = await supabase
      .from('disbursement_requests')
      .insert({
        origin: 'api',
        tenant_id: body.tenant_id,
        customer_id: body.customer_id,
        client_request_id: body.client_request_id,
        msisdn: body.msisdn,
        amount: body.amount,
        status: 'queued',
        partner_id: user.partner_id,
        mpesa_shortcode: shortcode.shortcode,
        partner_shortcode_id: shortcode.id,
        balance_updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { error: 'Failed to create disbursement request' },
        { status: 500 }
      )
    }

    // Call M-Pesa B2C API via Edge Function
    try {
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/disburse`
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          amount: body.amount,
          msisdn: body.msisdn,
          tenant_id: body.tenant_id,
          customer_id: body.customer_id,
          client_request_id: body.client_request_id,
          partner_id: user.partner_id,
          shortcode_id: shortcode.id
        })
      })

      const result = await response.json()

      if (result.status === 'accepted') {
        // Update request status
        await supabase
          .from('disbursement_requests')
          .update({ 
            status: 'accepted',
            conversation_id: result.conversation_id
          })
          .eq('id', disbursementRequest.id)

        return NextResponse.json({
          success: true,
          disbursement_id: disbursementRequest.id,
          conversation_id: result.conversation_id,
          status: 'accepted',
          message: 'Disbursement request accepted'
        })
      } else {
        // Update request status to failed
        await supabase
          .from('disbursement_requests')
          .update({ 
            status: 'failed',
            result_code: result.error_code,
            result_desc: result.error_message
          })
          .eq('id', disbursementRequest.id)

        return NextResponse.json({
          success: false,
          error: result.error_message,
          error_code: result.error_code
        }, { status: 400 })
      }
    } catch (mpesaError) {
      // Update request status to failed
      await supabase
        .from('disbursement_requests')
        .update({ 
          status: 'failed',
          result_desc: 'M-Pesa service unavailable'
        })
        .eq('id', disbursementRequest.id)

      return NextResponse.json({
        success: false,
        error: 'M-Pesa service unavailable'
      }, { status: 503 })
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
