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

    // Fetch loan details from Mifos X API
    console.log('[Mifos Webhook] Fetching loan details from Mifos X API...')
    
    try {
      // Get loan details
      const loanDetails = await fetchLoanDetailsFromMifos(partner, loanId)
      if (!loanDetails) {
        throw new Error('Failed to fetch loan details from Mifos X')
      }
      
      // Get client details
      const clientDetails = await fetchClientDetailsFromMifos(partner, clientId)
      if (!clientDetails) {
        throw new Error('Failed to fetch client details from Mifos X')
      }
      
      console.log('[Mifos Webhook] Loan details:', {
        amount: loanDetails.principal,
        productId: loanDetails.loanProductId,
        productName: loanDetails.loanProductName
      })
      
      console.log('[Mifos Webhook] Client details:', {
        name: clientDetails.displayName,
        phone: clientDetails.mobileNo
      })
      
      // Validate we have all required data
      if (!loanDetails.principal || !clientDetails.mobileNo) {
        throw new Error('Missing required loan or client data')
      }
      
      // Check auto-disbursal configuration for this loan product
      const { data: autoDisbursalConfig, error: configError } = await supabase
        .from('loan_product_auto_disbursal_configs')
        .select('*')
        .eq('partner_id', partner.id)
        .eq('product_id', loanDetails.loanProductId)
        .eq('enabled', true)
        .single()

      if (configError || !autoDisbursalConfig) {
        console.log('[Mifos Webhook] No auto-disbursal configuration found for product:', loanDetails.loanProductId)
        return NextResponse.json({ 
          success: true, 
          message: 'No auto-disbursal configuration for this loan product',
          requiresManualProcessing: true,
          loanDetails,
          clientDetails
        }, { status: 200 })
      }

      // Validate loan amount against auto-disbursal limits
      if (loanDetails.principal < autoDisbursalConfig.min_amount || loanDetails.principal > autoDisbursalConfig.max_amount) {
        console.log('[Mifos Webhook] Loan amount outside auto-disbursal limits')
        return NextResponse.json({ 
          success: true, 
          message: 'Loan amount outside auto-disbursal limits',
          requiresManualProcessing: true,
          details: {
            loanAmount: loanDetails.principal,
            minAmount: autoDisbursalConfig.min_amount,
            maxAmount: autoDisbursalConfig.max_amount
          }
        }, { status: 200 })
      }

      // Create disbursement record
      const disbursementData = {
        partner_id: partner.id,
        tenant_id: partner.tenant_id || 'default',
        msisdn: clientDetails.mobileNo,
        amount: loanDetails.principal,
        customer_id: clientId.toString(),
        client_request_id: `mifos_${loanId}_${Date.now()}`,
        external_reference: loanId.toString(),
        origin: 'ui',
        description: `Automated loan disbursement for ${clientDetails.displayName} - Product: ${loanDetails.loanProductName}`,
        currency: 'KES',
        metadata: {
          mifos_loan_id: loanId,
          mifos_client_id: clientId,
          mifos_product_id: loanDetails.loanProductId,
          mifos_product_name: loanDetails.loanProductName,
          client_name: clientDetails.displayName,
          approved_at: changes.approvedOnDate,
          webhook_received_at: new Date().toISOString(),
          auto_disbursal_config_id: autoDisbursalConfig.id
        }
      }

      const { data: disbursement, error: disbursementError } = await supabase
        .from('disbursement_requests')
        .insert(disbursementData)
        .select()
        .single()

      if (disbursementError) {
        console.error('[Mifos Webhook] Failed to create disbursement record:', disbursementError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create disbursement record',
          details: disbursementError.message 
        }, { status: 500 })
      }

      console.log('[Mifos Webhook] Created disbursement record:', disbursement.id)

      // Create loan tracking record
      const { data: trackingData, error: trackingError } = await supabase
        .from('loan_tracking')
        .insert({
          partner_id: partner.id,
          loan_id: loanId,
          client_id: clientId,
          client_name: clientDetails.displayName || 'Unknown Client',
          phone_number: clientDetails.mobileNo || 'Unknown',
          loan_amount: loanDetails.principal,
          disbursement_id: disbursement.id,
          status: 'approved',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (trackingError) {
        console.error('[Mifos Webhook] Error creating loan tracking record:', trackingError)
        // Continue with disbursement even if tracking fails
      } else {
        console.log('[Mifos Webhook] Created loan tracking record:', trackingData.id)
      }

      // Trigger disbursement via existing disbursement system
      const disbursementResult = await triggerDisbursement(disbursement.id, partner)

      if (disbursementResult.success) {
        console.log('[Mifos Webhook] Disbursement successful:', disbursementResult.transactionId)
        
        // Update loan tracking record with success
        if (trackingData) {
          await supabase
            .from('loan_tracking')
            .update({ 
              status: 'disbursed',
              disbursement_status: 'completed',
              mpesa_receipt_number: disbursementResult.mpesaReceiptNumber,
              updated_at: new Date().toISOString()
            })
            .eq('id', trackingData.id)
        }
        
        return NextResponse.json({
          success: true,
          message: 'Loan disbursement processed successfully',
          disbursementId: disbursement.id,
          transactionId: disbursementResult.transactionId,
          mpesaReceiptNumber: disbursementResult.mpesaReceiptNumber,
          loanDetails,
          clientDetails
        }, { status: 200 })
      } else {
        console.error('[Mifos Webhook] Disbursement failed:', disbursementResult.error)
        
        // Update loan tracking record with failure
        if (trackingData) {
          await supabase
            .from('loan_tracking')
            .update({ 
              status: 'failed',
              disbursement_status: 'failed',
              error_message: disbursementResult.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', trackingData.id)
        }
        
        // Update disbursement record with failure status
        await supabase
          .from('disbursement_requests')
          .update({ 
            status: 'failed',
            error_message: disbursementResult.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', disbursement.id)

        return NextResponse.json({
          success: false,
          error: 'Disbursement failed',
          details: disbursementResult.error,
          disbursementId: disbursement.id
        }, { status: 500 })
      }
      
    } catch (error) {
      console.error('[Mifos Webhook] Error fetching loan details:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch loan details from Mifos X',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }


  } catch (error) {
    console.error('[Mifos Webhook] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Fetch loan details from Mifos X API
async function fetchLoanDetailsFromMifos(partner: any, loanId: number) {
  try {
    const mifosUrl = `${partner.mifos_host_url}/fineract-provider/api/v1/loans/${loanId}?tenantIdentifier=${partner.mifos_tenant_id}`
    
    const response = await fetch(mifosUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64')}`,
        'Fineract-Platform-TenantId': partner.mifos_tenant_id
      }
    })

    if (!response.ok) {
      throw new Error(`Mifos X API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      principal: data.principal,
      loanProductId: data.loanProductId,
      loanProductName: data.loanProductName,
      currency: data.currency?.code || 'KES',
      termInMonths: data.numberOfRepayments,
      interestRate: data.nominalInterestRatePerPeriod
    }
  } catch (error) {
    console.error('[Mifos Webhook] Error fetching loan details:', error)
    throw error
  }
}

// Fetch client details from Mifos X API
async function fetchClientDetailsFromMifos(partner: any, clientId: number) {
  try {
    const mifosUrl = `${partner.mifos_host_url}/fineract-provider/api/v1/clients/${clientId}?tenantIdentifier=${partner.mifos_tenant_id}`
    
    const response = await fetch(mifosUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64')}`,
        'Fineract-Platform-TenantId': partner.mifos_tenant_id
      }
    })

    if (!response.ok) {
      throw new Error(`Mifos X API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      displayName: data.displayName,
      mobileNo: data.mobileNo,
      email: data.emailAddress,
      accountNo: data.accountNo
    }
  } catch (error) {
    console.error('[Mifos Webhook] Error fetching client details:', error)
    throw error
  }
}

// Trigger disbursement via existing disbursement system
async function triggerDisbursement(disbursementId: string, partner: any): Promise<{ success: boolean; transactionId?: string; mpesaReceiptNumber?: string; error?: string }> {
  try {
    // Call the existing disbursement Edge Function
    const disbursementUrl = `${supabaseUrl}/functions/v1/disburse`
    
    const response = await fetch(disbursementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-api-key': partner.api_key
      },
      body: JSON.stringify({
        disbursement_id: disbursementId
      })
    })

    const data = await response.json()

    if (response.ok && data.status === 'success') {
      return {
        success: true,
        transactionId: data.transaction_id,
        mpesaReceiptNumber: data.mpesa_receipt_number
      }
    } else {
      return {
        success: false,
        error: data.error_message || data.error || 'Disbursement failed'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


