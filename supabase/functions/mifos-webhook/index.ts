// Mifos X Webhook Handler
// This function handles webhooks from Mifos X for loan approvals and triggers automated disbursements
// Date: December 2024
// Version: 1.0

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MifosClient } from '../_shared/mifos-client.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

interface MifosWebhookPayload {
  eventType: string
  partnerId: string
  loanId: string
  clientId: string
  clientPhone: string
  clientName?: string
  loanAmount: number
  productId: string
  productName?: string
  approvedAt: string
  webhookToken: string
  // Additional fields that might be sent by Mifos X
  currency?: string
  interestRate?: number
  termInMonths?: number
  disbursementDate?: string
}

interface WebhookValidationResult {
  isValid: boolean
  partnerId?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    console.log(`[Mifos Webhook] ${method} ${path}`)

    // Route handling
    switch (true) {
      case path.endsWith('/loan-approval') && method === 'POST':
        return await handleLoanApprovalWebhook(req)
      
      case path.endsWith('/test') && method === 'GET':
        return await handleWebhookTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Endpoint not found',
            available_endpoints: [
              'POST /loan-approval',
              'GET /test'
            ]
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('[Mifos Webhook] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Handle loan approval webhook from Mifos X
 */
async function handleLoanApprovalWebhook(req: Request) {
  try {
    const payload: MifosWebhookPayload = await req.json()
    
    console.log('[Loan Approval Webhook] Received payload:', JSON.stringify(payload, null, 2))

    // Validate webhook payload
    const validation = await validateWebhookPayload(payload)
    if (!validation.isValid) {
      console.error('[Loan Approval Webhook] Validation failed:', validation.error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook validation failed',
          details: validation.error 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get partner configuration
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('*')
      .eq('id', validation.partnerId)
      .eq('is_active', true)
      .eq('is_mifos_configured', true)
      .eq('mifos_auto_disbursement_enabled', true)
      .single()

    if (partnerError || !partner) {
      console.error('[Loan Approval Webhook] Partner not found or not configured:', partnerError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Partner not found or Mifos X not configured' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[Loan Approval Webhook] Processing for partner:', partner.name)

    // Validate loan amount against partner limits
    if (partner.mifos_max_disbursement_amount && payload.loanAmount > partner.mifos_max_disbursement_amount) {
      console.error('[Loan Approval Webhook] Loan amount exceeds maximum limit')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Loan amount exceeds maximum disbursement limit',
          details: `Amount: ${payload.loanAmount}, Max: ${partner.mifos_max_disbursement_amount}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (partner.mifos_min_disbursement_amount && payload.loanAmount < partner.mifos_min_disbursement_amount) {
      console.error('[Loan Approval Webhook] Loan amount below minimum limit')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Loan amount below minimum disbursement limit',
          details: `Amount: ${payload.loanAmount}, Min: ${partner.mifos_min_disbursement_amount}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if loan has already been processed
    const { data: existingDisbursement, error: checkError } = await supabaseClient
      .from('disbursements')
      .select('id, status')
      .eq('partner_id', partner.id)
      .eq('external_reference', payload.loanId)
      .single()

    if (existingDisbursement) {
      console.log('[Loan Approval Webhook] Loan already processed:', existingDisbursement.status)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Loan already processed',
          disbursementId: existingDisbursement.id,
          status: existingDisbursement.status
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create disbursement record
    const disbursementData = {
      partner_id: partner.id,
      msisdn: payload.clientPhone,
      amount: payload.loanAmount,
      customer_id: payload.clientId,
      client_request_id: `mifos_${payload.loanId}_${Date.now()}`,
      external_reference: payload.loanId,
      origin: 'mifos_webhook',
      description: `Automated loan disbursement for ${payload.clientName || 'Client'} - Product: ${payload.productName || payload.productId}`,
      currency: payload.currency || 'KES',
      metadata: {
        mifos_loan_id: payload.loanId,
        mifos_client_id: payload.clientId,
        mifos_product_id: payload.productId,
        mifos_product_name: payload.productName,
        client_name: payload.clientName,
        interest_rate: payload.interestRate,
        term_in_months: payload.termInMonths,
        approved_at: payload.approvedAt,
        webhook_received_at: new Date().toISOString()
      }
    }

    const { data: disbursement, error: disbursementError } = await supabaseClient
      .from('disbursements')
      .insert(disbursementData)
      .select()
      .single()

    if (disbursementError) {
      console.error('[Loan Approval Webhook] Failed to create disbursement record:', disbursementError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create disbursement record',
          details: disbursementError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[Loan Approval Webhook] Created disbursement record:', disbursement.id)

    // Trigger disbursement via existing disbursement system
    const disbursementResult = await triggerDisbursement(disbursement.id, partner)

    if (disbursementResult.success) {
      console.log('[Loan Approval Webhook] Disbursement successful:', disbursementResult.transactionId)
      
      // Update Mifos X with disbursement status
      await updateMifosLoanStatus(partner, payload.loanId, 'disbursed', disbursementResult.transactionId)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Loan disbursement processed successfully',
          disbursementId: disbursement.id,
          transactionId: disbursementResult.transactionId,
          mpesaReceiptNumber: disbursementResult.mpesaReceiptNumber
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('[Loan Approval Webhook] Disbursement failed:', disbursementResult.error)
      
      // Update disbursement record with failure status
      await supabaseClient
        .from('disbursements')
        .update({ 
          status: 'failed',
          error_message: disbursementResult.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', disbursement.id)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Disbursement failed',
          details: disbursementResult.error,
          disbursementId: disbursement.id
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('[Loan Approval Webhook] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Webhook processing failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Validate webhook payload
 */
async function validateWebhookPayload(payload: MifosWebhookPayload): Promise<WebhookValidationResult> {
  // Check required fields
  if (!payload.eventType || !payload.partnerId || !payload.loanId || !payload.clientId || !payload.clientPhone || !payload.loanAmount || !payload.webhookToken) {
    return {
      isValid: false,
      error: 'Missing required fields: eventType, partnerId, loanId, clientId, clientPhone, loanAmount, webhookToken'
    }
  }

  // Validate event type
  if (payload.eventType !== 'loan_approved') {
    return {
      isValid: false,
      error: `Invalid event type: ${payload.eventType}. Expected: loan_approved`
    }
  }

  // Validate partner ID format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(payload.partnerId)) {
    return {
      isValid: false,
      error: 'Invalid partner ID format'
    }
  }

  // Validate phone number format
  const phoneRegex = /^254\d{9}$/
  if (!phoneRegex.test(payload.clientPhone)) {
    return {
      isValid: false,
      error: 'Invalid phone number format. Expected: 254XXXXXXXXX'
    }
  }

  // Validate loan amount
  if (payload.loanAmount <= 0 || payload.loanAmount > 1000000) {
    return {
      isValid: false,
      error: 'Invalid loan amount. Must be between 1 and 1,000,000'
    }
  }

  // Validate webhook token
  const { data: partner, error } = await supabaseClient
    .from('partners')
    .select('mifos_webhook_secret_token')
    .eq('id', payload.partnerId)
    .single()

  if (error || !partner) {
    return {
      isValid: false,
      error: 'Partner not found'
    }
  }

  if (partner.mifos_webhook_secret_token !== payload.webhookToken) {
    return {
      isValid: false,
      error: 'Invalid webhook token'
    }
  }

  return {
    isValid: true,
    partnerId: payload.partnerId
  }
}

/**
 * Trigger disbursement via existing disbursement system
 */
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
      error: error.message
    }
  }
}

/**
 * Update Mifos X loan status
 */
async function updateMifosLoanStatus(partner: any, loanId: string, status: string, transactionId?: string): Promise<void> {
  try {
    if (!partner.mifos_host_url || !partner.mifos_username || !partner.mifos_password || !partner.mifos_tenant_id) {
      console.log('[Mifos Update] Partner not configured for Mifos X updates')
      return
    }

    const mifosConfig = {
      hostUrl: partner.mifos_host_url,
      username: partner.mifos_username,
      password: partner.mifos_password,
      tenantId: partner.mifos_tenant_id,
      apiEndpoint: partner.mifos_api_endpoint
    }

    const mifosClient = new MifosClient(supabaseClient, mifosConfig)
    
    // Update loan status in Mifos X
    await mifosClient.updateLoanStatus(
      parseInt(loanId),
      status,
      `Loan ${status} via Payment Vault system. Transaction ID: ${transactionId}`
    )

    console.log('[Mifos Update] Successfully updated loan status in Mifos X')
  } catch (error) {
    console.error('[Mifos Update] Failed to update loan status in Mifos X:', error)
    // Don't throw error - this is not critical for the webhook response
  }
}

/**
 * Handle webhook test endpoint
 */
async function handleWebhookTest(req: Request) {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Mifos X webhook endpoint is working',
      timestamp: new Date().toISOString(),
      endpoints: {
        'POST /loan-approval': 'Handle loan approval webhooks from Mifos X',
        'GET /test': 'Test webhook endpoint health'
      }
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

