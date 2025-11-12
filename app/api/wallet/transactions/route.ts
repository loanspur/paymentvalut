import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get current user from database to get partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const transaction_type = searchParams.get('transaction_type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const search = searchParams.get('search')
    const requestedPartnerId = searchParams.get('partner_id')
    
    const offset = (page - 1) * limit

    // Determine which partner's wallet to query - SECURITY: Enforce partner isolation
    let partnerId: string | null = null
    
    if (user.role === 'super_admin') {
      // Only super_admin can query any partner
      partnerId = requestedPartnerId || user.partner_id || null
    } else {
      // All other users (including admin) can only access their own partner
      partnerId = user.partner_id
      
      // If they requested a different partner, deny access
      if (requestedPartnerId && requestedPartnerId !== user.partner_id) {
        return NextResponse.json(
          { success: false, error: 'Access denied: You can only view your own partner\'s transactions' },
          { status: 403 }
        )
      }
    }

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'No partner assigned' },
        { status: 400 }
      )
    }

    // Get wallet for the specific partner
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select('id, current_balance, partner_id')
      .eq('partner_id', partnerId)

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    if (!wallets || wallets.length === 0) {
      // Return empty result if no wallet exists
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          total_transactions: 0,
          total_amount: 0,
          total_topups: 0,
          total_disbursements: 0,
          total_float_purchases: 0,
          completed_transactions: 0,
          pending_transactions: 0,
          failed_transactions: 0,
          today_transactions: 0,
          today_amount: 0
        },
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
    // Apply filters FIRST, then pagination
    let query = supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .in('wallet_id', walletIds)

    // Apply filters BEFORE pagination
    if (transaction_type) {
      // Normalize transaction_type: handle both 'top_up' and 'topup'
      let normalizedType = transaction_type.toLowerCase()
      if (normalizedType === 'top_up' || normalizedType === 'topup') {
        // Check for both 'top_up' and 'topup' in database (handle legacy values)
        query = query.in('transaction_type', ['top_up', 'topup'])
      } else {
        query = query.eq('transaction_type', normalizedType)
      }
    }

    if (status) {
      // Normalize status: map 'success' to 'completed' if needed
      const normalizedStatus = status.toLowerCase() === 'success' ? 'completed' : status.toLowerCase()
      query = query.eq('status', normalizedStatus)
    }

    if (start_date) {
      query = query.gte('created_at', `${start_date}T00:00:00.000Z`)
    }

    if (end_date) {
      query = query.lte('created_at', `${end_date}T23:59:59.999Z`)
    }

    if (search) {
      query = query.or(`reference.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply ordering and pagination AFTER filters
    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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

    // Group transactions by wallet_id for efficient balance calculation
    const walletTransactionGroups: Record<string, any[]> = {}
    data?.forEach(transaction => {
      if (!walletTransactionGroups[transaction.wallet_id]) {
        walletTransactionGroups[transaction.wallet_id] = []
      }
      walletTransactionGroups[transaction.wallet_id].push(transaction)
    })

    // Calculate balance after for each transaction
    // Start from current wallet balance and work backwards through transactions
    const walletBalanceAfter: Record<string, number> = {}
    
    Object.keys(walletTransactionGroups).forEach(walletId => {
      const walletInfo = walletMap[walletId]
      const currentBalance = walletInfo?.current_balance || 0
      
      // Sort transactions by date descending (newest first)
      const transactions = walletTransactionGroups[walletId]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      // Work backwards from current balance
      let runningBalance = currentBalance
      transactions.forEach(transaction => {
        // Store balance after this transaction
        walletBalanceAfter[transaction.id] = runningBalance
        
        // Reverse the transaction to get balance before
        if (transaction.status === 'completed') {
          if (transaction.transaction_type === 'top_up' || 
              transaction.transaction_type === 'manual_credit' ||
              transaction.transaction_type === 'topup') {
            // This was a credit, so subtract to get balance before
            runningBalance -= Math.abs(transaction.amount)
          } else {
            // This was a debit, so add to get balance before
            runningBalance += Math.abs(transaction.amount)
          }
        }
      })
    })

    // Transform data to include partner information and wallet balance after
    const transformedData = data?.map((transaction) => {
      const walletInfo = walletMap[transaction.wallet_id]
      // Prefer balance captured by the unified writer in transaction metadata
      const metadata = (transaction.metadata || {}) as any
      const balanceAfterFromMetadata = typeof metadata.wallet_balance_after === 'number' 
        ? metadata.wallet_balance_after 
        : (typeof metadata.walletBalanceAfter === 'number' ? metadata.walletBalanceAfter : null)
      
      // Use metadata balance if available, otherwise use calculated balance
      const balanceAfter = balanceAfterFromMetadata !== null && balanceAfterFromMetadata !== undefined
        ? balanceAfterFromMetadata
        : (walletBalanceAfter[transaction.id] ?? walletInfo?.current_balance ?? 0)

      return {
        ...transaction,
        partner_id: walletInfo?.partner_id,
        partner_name: walletInfo?.partner_name || 'N/A',
        partner_short_code: walletInfo?.partner_short_code || 'N/A',
        wallet_balance_after: balanceAfter
      }
    }) || []

    // Get transaction summary (only for the filtered wallet)
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