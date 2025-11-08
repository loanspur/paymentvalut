import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partner_id = searchParams.get('partner_id')
    const transaction_type = searchParams.get('transaction_type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    
    const offset = (page - 1) * limit

    // Build query for wallet transactions
    let query = supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (partner_id) {
      // First get wallet IDs for the partner
      const { data: wallets, error: walletsError } = await supabase
        .from('partner_wallets')
        .select('id')
        .eq('partner_id', partner_id)

      if (walletsError) {
        console.error('Error fetching wallets for partner:', walletsError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch partner wallets' },
          { status: 500 }
        )
      }

      const walletIds = wallets?.map(w => w.id) || []
      if (walletIds.length > 0) {
        query = query.in('wallet_id', walletIds)
      } else {
        // No wallets found for this partner, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          summary: {},
          pagination: {
            page,
            limit,
            offset,
            total: 0,
            total_pages: 0,
            has_more: false
          }
        })
      }
    }

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

    // Apply pagination after all filters
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching admin wallet transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet transactions', details: error.message },
        { status: 500 }
      )
    }

    // Log for debugging
    console.log('Admin wallet transactions query result:', {
      dataCount: data?.length || 0,
      totalCount: count || 0,
      offset,
      limit
    })

    // Get partner information for all transactions
    const walletIds = data?.map(t => t.wallet_id) || []
    let partnerMap: Record<string, { partner_id: string; partner_name: string }> = {}
    
    if (walletIds.length > 0) {
      const { data: wallets, error: walletsError } = await supabase
        .from('partner_wallets')
        .select(`
          id,
          partner_id,
          partners (
            id,
            name
          )
        `)
        .in('id', walletIds)
      
      if (!walletsError && wallets) {
        partnerMap = wallets.reduce((acc, wallet) => {
          acc[wallet.id] = {
            partner_id: wallet.partner_id,
            partner_name: (wallet.partners as any)?.name || 'Unknown Partner'
          }
          return acc
        }, {})
      }
    }

    // Transform data to include partner information
    const transformedData = data?.map(transaction => ({
      id: transaction.id,
      wallet_id: transaction.wallet_id,
      partner_id: partnerMap[transaction.wallet_id]?.partner_id,
      partner_name: partnerMap[transaction.wallet_id]?.partner_name,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      reference: transaction.reference,
      description: transaction.description,
      status: transaction.status,
      created_at: transaction.created_at,
      metadata: transaction.metadata
    })) || []

    // Get transaction summary (without pagination for global stats)
    const { data: summaryData, error: summaryError } = await supabase
      .from('wallet_transactions')
      .select('transaction_type, amount, status, created_at')

    if (summaryError) {
      console.error('Error fetching transaction summary:', summaryError)
    }

    // Calculate summary
    const summary = {
      total_transactions: summaryData?.length || 0,
      total_amount: summaryData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      total_topups: summaryData?.filter(t => t.transaction_type === 'topup').length || 0,
      total_disbursements: summaryData?.filter(t => t.transaction_type === 'disbursement').length || 0,
      total_float_purchases: summaryData?.filter(t => t.transaction_type === 'b2c_float_purchase').length || 0,
      total_charges: summaryData?.filter(t => t.transaction_type === 'charge').length || 0,
      total_manual_credits: summaryData?.filter(t => t.transaction_type === 'manual_credit').length || 0,
      total_manual_debits: summaryData?.filter(t => t.transaction_type === 'manual_debit').length || 0,
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
    console.error('Admin Wallet Transactions GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
