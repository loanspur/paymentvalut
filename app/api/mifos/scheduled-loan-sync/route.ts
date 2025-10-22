import { NextRequest, NextResponse } from 'next/server'

// Scheduled job to sync loans from Mifos X and process pending disbursements
// Updated: Enhanced with timestamp logging for better monitoring
export async function POST(request: NextRequest) {
  try {
    console.log('[Scheduled Job] Starting loan sync and processing...', new Date().toISOString())
    
    const results = {
      fetchResults: null,
      processResults: null,
      timestamp: new Date().toISOString()
    }

    // Step 1: Fetch pending loans from Mifos X
    try {
      console.log('[Scheduled Job] Step 1: Fetching pending loans from Mifos X...')
      
      const fetchResponse = await fetch(`${request.nextUrl.origin}/api/mifos/fetch-pending-loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (fetchResponse.ok) {
        results.fetchResults = await fetchResponse.json()
        console.log('[Scheduled Job] Step 1 completed:', results.fetchResults.message)
      } else {
        console.error('[Scheduled Job] Step 1 failed:', fetchResponse.status)
        results.fetchResults = { error: `Fetch failed with status ${fetchResponse.status}` }
      }
    } catch (fetchError) {
      console.error('[Scheduled Job] Step 1 error:', fetchError)
      results.fetchResults = { error: fetchError instanceof Error ? fetchError.message : 'Unknown error' }
    }

    // Step 2: Process pending loans for disbursement
    try {
      console.log('[Scheduled Job] Step 2: Processing pending loans for disbursement...')
      
      const processResponse = await fetch(`${request.nextUrl.origin}/api/mifos/process-pending-loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (processResponse.ok) {
        results.processResults = await processResponse.json()
        console.log('[Scheduled Job] Step 2 completed:', results.processResults.message)
      } else {
        console.error('[Scheduled Job] Step 2 failed:', processResponse.status)
        results.processResults = { error: `Process failed with status ${processResponse.status}` }
      }
    } catch (processError) {
      console.error('[Scheduled Job] Step 2 error:', processError)
      results.processResults = { error: processError instanceof Error ? processError.message : 'Unknown error' }
    }

    // Calculate summary
    const summary = {
      success: true,
      timestamp: results.timestamp,
      fetchSuccess: results.fetchResults?.success || false,
      processSuccess: results.processResults?.success || false,
      totalFetched: results.fetchResults?.totalProcessedLoans || 0,
      totalProcessed: results.processResults?.processedLoans || 0,
      message: `Sync completed: ${results.fetchResults?.totalProcessedLoans || 0} loans fetched, ${results.processResults?.processedLoans || 0} loans processed`
    }

    console.log('[Scheduled Job] Completed:', summary.message)

    return NextResponse.json({
      success: true,
      summary,
      details: results
    })

  } catch (error) {
    console.error('[Scheduled Job] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Scheduled Loan Sync API',
    usage: 'POST /api/mifos/scheduled-loan-sync',
    description: 'Fetches pending loans from Mifos X and processes them for disbursement'
  })
}
