import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Trigger real-time balance check for all partners or a specific partner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partner_id, all_tenants = false, force_check = true } = body

    // Call the Supabase Edge Function for balance monitoring
    const functionUrl = `${supabaseUrl}/functions/v1/balance-monitor`
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        partner_id,
        force_check
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Balance monitor function error:', errorText)
      return NextResponse.json(
        { 
          error: 'Failed to trigger balance check',
          details: errorText
        },
        { status: 500 }
      )
    }

    const result = await response.json()
    
    console.log('Balance check results:', result)

    // Calculate summary for frontend
    const results = result.results || []
    const successful = results.filter((r: any) => r.status === 'checked').length
    const failed = results.filter((r: any) => r.status === 'error').length
    const skipped = results.filter((r: any) => r.status === 'skipped').length
    const total = results.length

    return NextResponse.json({
      success: true,
      message: 'Balance check triggered successfully',
      results: results,
      summary: {
        total,
        successful,
        failed,
        skipped
      },
      timestamp: result.timestamp
    })

  } catch (error) {
    console.error('Error triggering balance check:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Get the status of recent balance checks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    // Get recent balance checks
    let query = supabase
      .from('balance_checks')
      .select(`
        id,
        partner_id,
        shortcode,
        balance_amount,
        balance_currency,
        check_timestamp,
        response_status,
        error_message,
        created_at,
        partners!inner(name)
      `)
      .order('check_timestamp', { ascending: false })
      .limit(50)

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    const { data: balanceChecks, error: balanceError } = await query

    if (balanceError) {
      console.error('Error fetching balance checks:', balanceError)
      return NextResponse.json(
        { error: 'Failed to fetch balance checks' },
        { status: 500 }
      )
    }

    // Get recent balance requests
    let requestQuery = supabase
      .from('balance_requests')
      .select(`
        id,
        partner_id,
        conversation_id,
        status,
        utility_account_balance,
        working_account_balance,
        charges_account_balance,
        created_at,
        updated_at,
        partners!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (partnerId) {
      requestQuery = requestQuery.eq('partner_id', partnerId)
    }

    const { data: balanceRequests, error: requestError } = await requestQuery

    if (requestError) {
      console.error('Error fetching balance requests:', requestError)
      return NextResponse.json(
        { error: 'Failed to fetch balance requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      balance_checks: balanceChecks || [],
      balance_requests: balanceRequests || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching balance check status:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}