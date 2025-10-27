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
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit

    // Get all wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select('id, current_balance, partner_id')

    if (walletsError || !wallets || wallets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No wallets found' },
        { status: 404 }
      )
    }

    // Get all partners
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code')

    if (partnersError) {
      console.error('Error fetching partners:', partnersError)
    }

    // Create maps for quick lookup
    const walletIds = wallets.map(w => w.id)
    const partnerMap = partners?.reduce((acc, partner) => {
      acc[partner.id] = partner
      return acc
    }, {} as Record<string, any>) || {}

    // Build query for wallet transactions
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .in('wallet_id', walletIds)
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

    if (search) {
      query = query.or(`reference.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching wallet transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet transactions' },
        { status: 500 }
      )
    }

    // Create a map of wallet_id to wallet info for quick lookup
    const walletMap = wallets.reduce((acc, wallet) => {
      const partner = partnerMap[wallet.partner_id]
      acc[wallet.id] = {
        current_balance: wallet.current_balance,
        partner_name: partner?.name || 'N/A',
        partner_short_code: partner?.short_code || 'N/A',
        partner_id: wallet.partner_id
      }
      return acc
    }, {} as Record<string, any>)

    // Transform data to include partner information and calculate wallet balance after
    const transformedData = data?.map((transaction) => {
      const walletInfo = walletMap[transaction.wallet_id]
      
      // Calculate wallet balance after this transaction
      // For now, we'll use a simple calculation based on transaction type
      // In a real implementation, you might want to calculate this more accurately
      let balanceAfter = walletInfo?.current_balance || 0
      
      if (transaction.transaction_type === 'top_up' || transaction.transaction_type === 'manual_credit') {
        balanceAfter = (walletInfo?.current_balance || 0) + Math.abs(transaction.amount)
      } else {
        balanceAfter = (walletInfo?.current_balance || 0) - Math.abs(transaction.amount)
      }

      return {
        ...transaction,
        partner_id: walletInfo?.partner_id,
        partner_name: walletInfo?.partner_name || 'N/A',
        partner_short_code: walletInfo?.partner_short_code || 'N/A',
        wallet_balance_after: balanceAfter
      }
    }) || []

    // Get transaction summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('wallet_transactions')
      .select('transaction_type, amount, status, created_at')
      .in('wallet_id', walletIds)

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
      data: transformedData,
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