import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transaction_type = searchParams.get('transaction_type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    
    const offset = (page - 1) * limit

    // Get the current user's partner (for now, get first partner as demo)
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id')
      .limit(1)
      .single()

    if (partnersError || !partners) {
      return NextResponse.json(
        { success: false, error: 'No partner found' },
        { status: 404 }
      )
    }

    // Get wallet for the partner
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('id')
      .eq('partner_id', partners.id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Build query for wallet transactions
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (transaction_type) {
      query = query.eq('transaction_type', transaction_type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (start_date) {
      query = query.gte('created_at', start_date)
    }

    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching wallet transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet transactions' },
        { status: 500 }
      )
    }

    // Get transaction summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('wallet_transactions')
      .select('transaction_type, amount, status, created_at')
      .eq('wallet_id', wallet.id)

    if (summaryError) {
      console.error('Error fetching wallet transaction summary:', summaryError)
    }

    // Calculate summary
    const summary = {
      total_transactions: summaryData?.length || 0,
      total_amount: summaryData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      total_topups: summaryData?.filter(t => t.transaction_type === 'top_up').length || 0,
      total_disbursements: summaryData?.filter(t => t.transaction_type === 'disbursement').length || 0,
      total_float_purchases: summaryData?.filter(t => t.transaction_type === 'b2c_float_purchase').length || 0,
      completed_transactions: summaryData?.filter(t => t.status === 'completed').length || 0,
      pending_transactions: summaryData?.filter(t => t.status === 'pending').length || 0,
      failed_transactions: summaryData?.filter(t => t.status === 'failed').length || 0,
      today_transactions: summaryData?.filter(t => {
        const today = new Date().toISOString().split('T')[0]
        return t.created_at?.startsWith(today)
      }).length || 0,
      today_amount: summaryData?.filter(t => {
        const today = new Date().toISOString().split('T')[0]
        return t.created_at?.startsWith(today)
      }).reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      summary,
      pagination: {
        page,
        limit,
        offset,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_more: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Wallet Transactions GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}