import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Fetch pending loans from Mifos X
async function fetchPendingLoansFromMifos(partner: any) {
  try {
    console.log(`[Loan Fetcher] Fetching pending loans for partner: ${partner.name}`)
    
    // Use HTTP Basic Authentication
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64')
    
    // Fetch loans with status "Approved" and waiting for disbursal
    const loansUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}/loans?status=300&limit=100`
    
    const loansResponse = await fetch(loansUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id,
        'Authorization': `Basic ${basicAuth}`
      }
    })

    if (!loansResponse.ok) {
      throw new Error(`Failed to fetch loans: ${loansResponse.status}`)
    }

    const loansData = await loansResponse.json()
    const loans = loansData.pageItems || loansData || []

    console.log(`[Loan Fetcher] Found ${loans.length} approved loans for partner: ${partner.name}`)

    // Filter for loans that are approved and waiting for disbursal
    const pendingLoans = loans.filter((loan: any) => 
      loan.status?.id === 300 && // Approved status
      loan.status?.waitingForDisbursal === true
    )

    console.log(`[Loan Fetcher] Found ${pendingLoans.length} loans waiting for disbursal`)

    return pendingLoans

  } catch (error) {
    console.error(`[Loan Fetcher] Error fetching loans for partner ${partner.name}:`, error)
    throw error
  }
}

// Fetch client details for a loan
async function fetchClientDetails(partner: any, clientId: number) {
  try {
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64')
    
    const clientUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}/clients/${clientId}?tenantIdentifier=${partner.mifos_tenant_id}`
    
    const clientResponse = await fetch(clientUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id,
        'Authorization': `Basic ${basicAuth}`
      }
    })

    if (!clientResponse.ok) {
      throw new Error(`Failed to fetch client details: ${clientResponse.status}`)
    }

    const clientData = await clientResponse.json()
    
    return {
      displayName: clientData.displayName,
      mobileNo: clientData.mobileNo,
      emailAddress: clientData.emailAddress,
      accountNo: clientData.accountNo
    }

  } catch (error) {
    console.error(`[Loan Fetcher] Error fetching client details for client ${clientId}:`, error)
    return {
      displayName: 'Unknown Client',
      mobileNo: 'Unknown',
      emailAddress: '',
      accountNo: ''
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Loan Fetcher] Starting pending loans fetch...')

    // Get all active partners with Mifos X configured
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .eq('is_mifos_configured', true)
      .eq('is_active', true)
      .eq('mifos_auto_disbursement_enabled', true)

    if (partnersError) {
      console.error('[Loan Fetcher] Error fetching partners:', partnersError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch partners' 
      }, { status: 500 })
    }

    if (!partners || partners.length === 0) {
      console.log('[Loan Fetcher] No active partners with Mifos X configured')
      return NextResponse.json({ 
        success: true, 
        message: 'No active partners found',
        processedLoans: 0
      })
    }

    let totalProcessedLoans = 0
    const results = []

    // Process each partner
    for (const partner of partners) {
      try {
        console.log(`[Loan Fetcher] Processing partner: ${partner.name}`)
        
        // Fetch pending loans from Mifos X
        const pendingLoans = await fetchPendingLoansFromMifos(partner)
        
        let partnerProcessedLoans = 0

        // Process each pending loan
        for (const loan of pendingLoans) {
          try {
            // Check if loan tracking record already exists
            const { data: existingRecord } = await supabase
              .from('loan_tracking')
              .select('id')
              .eq('partner_id', partner.id)
              .eq('loan_id', loan.id)
              .single()

            if (existingRecord) {
              console.log(`[Loan Fetcher] Loan ${loan.id} already tracked, skipping`)
              continue
            }

            // Fetch client details
            const clientDetails = await fetchClientDetails(partner, loan.clientId)

            // Create loan tracking record
            const { data: trackingRecord, error: trackingError } = await supabase
              .from('loan_tracking')
              .insert({
                partner_id: partner.id,
                loan_id: loan.id,
                client_id: loan.clientId,
                client_name: clientDetails.displayName,
                phone_number: clientDetails.mobileNo,
                loan_amount: loan.principal,
                status: 'pending_disbursement',
                created_at: new Date().toISOString()
              })
              .select()
              .single()

            if (trackingError) {
              console.error(`[Loan Fetcher] Error creating tracking record for loan ${loan.id}:`, trackingError)
              continue
            }

            console.log(`[Loan Fetcher] Created tracking record for loan ${loan.id}: ${trackingRecord.id}`)
            partnerProcessedLoans++

          } catch (loanError) {
            console.error(`[Loan Fetcher] Error processing loan ${loan.id}:`, loanError)
            continue
          }
        }

        totalProcessedLoans += partnerProcessedLoans
        results.push({
          partner: partner.name,
          pendingLoans: pendingLoans.length,
          processedLoans: partnerProcessedLoans
        })

      } catch (partnerError) {
        console.error(`[Loan Fetcher] Error processing partner ${partner.name}:`, partnerError)
        results.push({
          partner: partner.name,
          error: partnerError instanceof Error ? partnerError.message : 'Unknown error'
        })
      }
    }

    console.log(`[Loan Fetcher] Completed. Total processed loans: ${totalProcessedLoans}`)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${totalProcessedLoans} pending loans`,
      totalProcessedLoans,
      results
    })

  } catch (error) {
    console.error('[Loan Fetcher] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Loan Fetcher API - Use POST to fetch pending loans',
    usage: 'POST /api/mifos/fetch-pending-loans'
  })
}
