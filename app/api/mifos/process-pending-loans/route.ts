import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Process pending loans for disbursement
async function processPendingLoans() {
  try {
    console.log('[Loan Processor] Starting pending loans processing...')

    // Get loans that are pending disbursement
    const { data: pendingLoans, error: loansError } = await supabase
      .from('loan_tracking')
      .select(`
        *,
        partners(*)
      `)
      .eq('status', 'pending_disbursement')
      .order('created_at', { ascending: true })
      .limit(10) // Process max 10 loans at a time

    if (loansError) {
      console.error('[Loan Processor] Error fetching pending loans:', loansError)
      return { success: false, error: 'Failed to fetch pending loans' }
    }

    if (!pendingLoans || pendingLoans.length === 0) {
      console.log('[Loan Processor] No pending loans found')
      return { success: true, processedLoans: 0, message: 'No pending loans to process' }
    }

    console.log(`[Loan Processor] Found ${pendingLoans.length} pending loans`)

    let processedCount = 0
    const results = []

    // Process each pending loan
    for (const loanRecord of pendingLoans) {
      try {
        const partner = loanRecord.partners
        
        console.log(`[Loan Processor] Processing loan ${loanRecord.loan_id} for partner ${partner.name}`)

        // Check auto-disbursal configuration
        const { data: autoDisbursalConfig } = await supabase
          .from('loan_product_auto_disbursal_configs')
          .select('*')
          .eq('partner_id', partner.id)
          .eq('enabled', true)
          .single()

        if (!autoDisbursalConfig) {
          console.log(`[Loan Processor] No auto-disbursal config for partner ${partner.name}, skipping`)
          continue
        }

        // Validate loan amount against limits
        if (loanRecord.loan_amount < autoDisbursalConfig.min_amount || 
            loanRecord.loan_amount > autoDisbursalConfig.max_amount) {
          console.log(`[Loan Processor] Loan amount ${loanRecord.loan_amount} outside limits for partner ${partner.name}`)
          
          // Update loan status to failed
          await supabase
            .from('loan_tracking')
            .update({ 
              status: 'failed',
              error_message: `Loan amount ${loanRecord.loan_amount} outside limits (${autoDisbursalConfig.min_amount} - ${autoDisbursalConfig.max_amount})`,
              updated_at: new Date().toISOString()
            })
            .eq('id', loanRecord.id)
          
          continue
        }

        // Create disbursement record
        const disbursementData = {
          partner_id: partner.id,
          phone_number: loanRecord.phone_number,
          amount: loanRecord.loan_amount,
          currency: 'KES',
          description: `Auto-disbursement for loan ${loanRecord.loan_id}`,
          metadata: {
            mifos_loan_id: loanRecord.loan_id,
            mifos_client_id: loanRecord.client_id,
            client_name: loanRecord.client_name,
            auto_disbursal_config_id: autoDisbursalConfig.id,
            processed_at: new Date().toISOString()
          },
          tenant_id: partner.tenant_id || 'default',
          origin: 'ui'
        }

        const { data: disbursement, error: disbursementError } = await supabase
          .from('disbursement_requests')
          .insert(disbursementData)
          .select()
          .single()

        if (disbursementError) {
          console.error(`[Loan Processor] Error creating disbursement for loan ${loanRecord.loan_id}:`, disbursementError)
          
          // Update loan status to failed
          await supabase
            .from('loan_tracking')
            .update({ 
              status: 'failed',
              error_message: `Failed to create disbursement: ${disbursementError.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', loanRecord.id)
          
          continue
        }

        // Update loan tracking record with disbursement ID
        await supabase
          .from('loan_tracking')
          .update({ 
            disbursement_id: disbursement.id,
            status: 'processing_disbursement',
            updated_at: new Date().toISOString()
          })
          .eq('id', loanRecord.id)

        console.log(`[Loan Processor] Created disbursement ${disbursement.id} for loan ${loanRecord.loan_id}`)

        // Trigger disbursement via existing disbursement system
        const disbursementResult = await triggerDisbursement(disbursement.id, partner)

        if (disbursementResult.success) {
          console.log(`[Loan Processor] Disbursement successful for loan ${loanRecord.loan_id}`)
          
          // Update loan tracking record with success
          await supabase
            .from('loan_tracking')
            .update({ 
              status: 'disbursed',
              disbursement_status: 'completed',
              mpesa_receipt_number: disbursementResult.mpesaReceiptNumber,
              updated_at: new Date().toISOString()
            })
            .eq('id', loanRecord.id)

          // Activate loan in Mifos X
          await activateLoanInMifos(partner, loanRecord.loan_id)

          processedCount++
          results.push({
            loanId: loanRecord.loan_id,
            status: 'success',
            disbursementId: disbursement.id,
            mpesaReceipt: disbursementResult.mpesaReceiptNumber
          })

        } else {
          console.error(`[Loan Processor] Disbursement failed for loan ${loanRecord.loan_id}:`, disbursementResult.error)
          
          // Update loan tracking record with failure
          await supabase
            .from('loan_tracking')
            .update({ 
              status: 'failed',
              disbursement_status: 'failed',
              error_message: disbursementResult.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', loanRecord.id)

          results.push({
            loanId: loanRecord.loan_id,
            status: 'failed',
            error: disbursementResult.error
          })
        }

      } catch (loanError) {
        console.error(`[Loan Processor] Error processing loan ${loanRecord.loan_id}:`, loanError)
        
        // Update loan status to failed
        await supabase
          .from('loan_tracking')
          .update({ 
            status: 'failed',
            error_message: loanError instanceof Error ? loanError.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', loanRecord.id)

        results.push({
          loanId: loanRecord.loan_id,
          status: 'error',
          error: loanError instanceof Error ? loanError.message : 'Unknown error'
        })
      }
    }

    console.log(`[Loan Processor] Completed. Processed ${processedCount} loans successfully`)

    return {
      success: true,
      processedLoans: processedCount,
      totalLoans: pendingLoans.length,
      results
    }

  } catch (error) {
    console.error('[Loan Processor] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Trigger disbursement via existing disbursement system
async function triggerDisbursement(disbursementId: string, partner: any): Promise<{ success: boolean; transactionId?: string; mpesaReceiptNumber?: string; error?: string }> {
  try {
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

// Activate loan in Mifos X after successful disbursement
async function activateLoanInMifos(partner: any, loanId: number) {
  try {
    console.log(`[Loan Processor] Activating loan ${loanId} in Mifos X`)
    
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64')
    
    const activateUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}/loans/${loanId}?command=disburseToSavings&tenantIdentifier=${partner.mifos_tenant_id}`
    
    const response = await fetch(activateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id,
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        locale: 'en',
        dateFormat: 'dd MMMM yyyy',
        actualDisbursementDate: new Date().toISOString().split('T')[0]
      })
    })

    if (response.ok) {
      console.log(`[Loan Processor] Successfully activated loan ${loanId} in Mifos X`)
    } else {
      console.error(`[Loan Processor] Failed to activate loan ${loanId} in Mifos X:`, response.status)
    }

  } catch (error) {
    console.error(`[Loan Processor] Error activating loan ${loanId} in Mifos X:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await processPendingLoans()
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }

  } catch (error) {
    console.error('[Loan Processor] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Loan Processor API - Use POST to process pending loans',
    usage: 'POST /api/mifos/process-pending-loans'
  })
}
