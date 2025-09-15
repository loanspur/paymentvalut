import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get latest balance data for a partner
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Get the latest completed balance request for the partner
    const { data: latestBalance, error: balanceError } = await supabase
      .from('balance_requests')
      .select(`
        id,
        partner_id,
        mpesa_shortcode,
        status,
        result_code,
        result_desc,
        balance_before,
        balance_after,
        utility_account_balance,
        created_at,
        updated_at
      `)
      .eq('partner_id', partnerId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching balance:', balanceError)
      return NextResponse.json(
        { error: 'Failed to fetch balance data' },
        { status: 500 }
      )
    }

    // Get partner information
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, mpesa_shortcode')
      .eq('id', partnerId)
      .single()

    if (partnerError) {
      console.error('Error fetching partner:', partnerError)
    }

    // Add partner info to balance data
    const balanceWithPartner = latestBalance ? {
      ...latestBalance,
      partners: partner || { id: partnerId, name: 'Unknown Partner', mpesa_shortcode: 'N/A' }
    } : null

    // Get recent balance requests for history
    const { data: balanceHistory, error: historyError } = await supabase
      .from('balance_requests')
      .select(`
        id,
        status,
        result_code,
        result_desc,
        balance_after,
        utility_account_balance,
        created_at,
        updated_at
      `)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.error('Error fetching balance history:', historyError)
    }

    return NextResponse.json({
      success: true,
      balance: balanceWithPartner,
      history: balanceHistory || [],
      lastUpdated: latestBalance?.updated_at || null
    })

  } catch (error) {
    console.error('Balance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
