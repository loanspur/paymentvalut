import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Actual Mifos X webhook payload structure
interface MifosWebhookPayload {
  officeId: number
  clientId: number
  loanId: number
  resourceId: number
  changes: {
    status: {
      id: number
      code: string
      value: string
      pendingApproval: boolean
      waitingForDisbursal: boolean
      active: boolean
      closedObligationsMet: boolean
      closedWrittenOff: boolean
      closedRescheduled: boolean
      closed: boolean
      overpaid: boolean
    }
    locale: string
    dateFormat: string
    approvedOnDate: string
    expectedDisbursementDate: any
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Mifos Webhook] Received loan approval webhook')

    const payload: MifosWebhookPayload = await request.json()
    console.log('[Mifos Webhook] Payload:', JSON.stringify(payload, null, 2))

    // Extract data from the actual Mifos X payload structure
    const { officeId, clientId, loanId, resourceId, changes } = payload

    // Validate required fields
    if (!loanId || !clientId || !officeId) {
      console.error('[Mifos Webhook] Missing required fields:', { loanId, clientId, officeId })
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: loanId, clientId, or officeId' 
      }, { status: 400 })
    }

    // Check if this is a loan approval
    const status = changes?.status
    if (!status || status.value !== 'Approved') {
      console.log('[Mifos Webhook] Not a loan approval webhook, ignoring')
      return NextResponse.json({ 
        success: true, 
        message: 'Not a loan approval webhook' 
      }, { status: 200 })
    }

    // Check if waiting for disbursal
    if (!status.waitingForDisbursal) {
      console.log('[Mifos Webhook] Loan approved but not waiting for disbursal, ignoring')
      return NextResponse.json({ 
        success: true, 
        message: 'Loan not waiting for disbursal' 
      }, { status: 200 })
    }

    console.log('[Mifos Webhook] Valid loan approval webhook received')
    console.log('[Mifos Webhook] Loan Details:', {
      loanId,
      clientId,
      officeId,
      approvedDate: changes.approvedOnDate,
      status: status.value
    })

    // TODO: For now, we need to identify which partner this belongs to
    // This could be done by officeId or by querying all partners with Mifos configured
    // For now, let's get the first active partner with Mifos configured
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .eq('is_mifos_configured', true)
      .eq('mifos_auto_disbursement_enabled', true)
      .single()

    if (partnerError || !partner) {
      console.error('[Mifos Webhook] No active partner with Mifos X configured found:', partnerError)
      return NextResponse.json({ 
        success: false, 
        error: 'No active partner with Mifos X configured found' 
      }, { status: 404 })
    }

    console.log('[Mifos Webhook] Processing for partner:', partner.name)

    // Check if loan has already been processed
    const { data: existingDisbursement, error: checkError } = await supabase
      .from('disbursement_requests')
      .select('id, status')
      .eq('partner_id', partner.id)
      .eq('external_reference', loanId.toString())
      .single()

    if (existingDisbursement) {
      console.log('[Mifos Webhook] Loan already processed:', existingDisbursement.status)
      return NextResponse.json({ 
        success: true, 
        message: 'Loan already processed',
        disbursementId: existingDisbursement.id,
        status: existingDisbursement.status
      }, { status: 200 })
    }

    // TODO: We need to fetch loan details from Mifos X API to get:
    // - Loan amount
    // - Client phone number
    // - Product ID
    // - Client name
    // For now, let's create a basic disbursement record and log that we need more data
    
    console.log('[Mifos Webhook] Need to fetch loan details from Mifos X API')
    console.log('[Mifos Webhook] Required data: loan amount, client phone, product ID')
    
    // For now, return success but indicate manual processing is needed
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received successfully. Manual processing required to fetch loan details from Mifos X API.',
      loanId,
      clientId,
      officeId,
      approvedDate: changes.approvedOnDate,
      requiresManualProcessing: true,
      nextSteps: [
        'Fetch loan details from Mifos X API using loanId',
        'Get client phone number from clientId',
        'Get loan amount and product information',
        'Process disbursement with complete data'
      ]
    }, { status: 200 })


  } catch (error) {
    console.error('[Mifos Webhook] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


