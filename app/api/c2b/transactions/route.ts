import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Authentication check
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

    // Get current user from database to get partner_id and role
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
    const requestedPartnerId = searchParams.get('partner_id')
    const transaction_type = searchParams.get('transaction_type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    
    const offset = (page - 1) * limit

    // Determine which partner's transactions to query - SECURITY: Enforce partner isolation
    let partnerId: string | null | 'unallocated' = null
    
    if (user.role === 'super_admin') {
      // Only super_admin can query any partner or unallocated transactions
      partnerId = requestedPartnerId || null
    } else {
      // All other users (including admin) can only access their own partner
      if (!user.partner_id) {
        return NextResponse.json(
          { success: false, error: 'No partner assigned to user' },
          { status: 400 }
        )
      }
      
      partnerId = user.partner_id
      
      // If they requested a different partner or unallocated, deny access
      if (requestedPartnerId && requestedPartnerId !== user.partner_id && requestedPartnerId !== 'unallocated') {
        return NextResponse.json(
          { success: false, error: 'Access denied: You can only view your own partner\'s transactions' },
          { status: 403 }
        )
      }
      
      // Regular users cannot view unallocated transactions
      if (requestedPartnerId === 'unallocated') {
        return NextResponse.json(
          { success: false, error: 'Access denied: You cannot view unallocated transactions' },
          { status: 403 }
        )
      }
    }

    // Build query without joins first (we'll get partner info separately)
    let query = supabase
      .from('c2b_transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply partner filter - SECURITY: Always filter by partner
    if (partnerId) {
      if (partnerId === 'unallocated') {
        query = query.is('partner_id', null)
      } else {
        query = query.eq('partner_id', partnerId)
      }
    } else if (user.role !== 'super_admin') {
      // Non-super_admin users must have a partner filter
      return NextResponse.json(
        { success: false, error: 'Partner filter required' },
        { status: 400 }
      )
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
      query = query.or(`transaction_id.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,bill_reference_number.ilike.%${search}%`)
    }

    // Apply pagination after all filters
    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching C2B transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch C2B transactions' },
        { status: 500 }
      )
    }

    // Get partner information for transactions that have partner_id
    const partnerIds = data?.filter(t => t.partner_id).map(t => t.partner_id) || []
    let partnersMap = {}
    
    if (partnerIds.length > 0) {
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, name, short_code')
        .in('id', partnerIds)
      
      if (!partnersError && partners) {
        partnersMap = partners.reduce((acc, partner) => {
          acc[partner.id] = partner
          return acc
        }, {})
      }
    }

    // Check wallet transactions for each C2B transaction
    const transactionIds = data?.map(t => t.transaction_id) || []
    let walletTransactionsMap = {}
    
    if (transactionIds.length > 0) {
      const { data: walletTransactions, error: walletError } = await supabase
        .from('wallet_transactions')
        .select('reference, status, amount')
        .in('reference', transactionIds)
      
      if (!walletError && walletTransactions) {
        walletTransactionsMap = walletTransactions.reduce((acc, wt) => {
          acc[wt.reference] = wt
          return acc
        }, {})
      }
    }

    // Transform data to include partner information and wallet status
    const transformedData = data?.map(transaction => ({
      ...transaction,
      partner_name: transaction.partner_id ? partnersMap[transaction.partner_id]?.name || null : null,
      partner_short_code: transaction.partner_id ? partnersMap[transaction.partner_id]?.short_code || null : null,
      payment_method: transaction.transaction_type === 'Pay Bill' ? 'NCBA Paybill' : 'Unknown',
      wallet_credited: walletTransactionsMap[transaction.transaction_id]?.status === 'completed' || false
    })) || []

    // Get transaction summary - SECURITY: Filter by partner for summary too
    let summaryQuery = supabase
      .from('c2b_transactions')
      .select('transaction_type, amount, status, created_at, partner_id')
    
    // Apply partner filter to summary query
    if (partnerId) {
      if (partnerId === 'unallocated') {
        summaryQuery = summaryQuery.is('partner_id', null)
      } else {
        summaryQuery = summaryQuery.eq('partner_id', partnerId)
      }
    }

    const { data: summaryData, error: summaryError } = await summaryQuery

    if (summaryError) {
      console.error('Error fetching C2B transaction summary:', summaryError)
    }

    // Calculate summary
    const summary = {
      total_transactions: summaryData?.length || 0,
      total_amount: summaryData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      total_paybill_transactions: summaryData?.filter(t => t.transaction_type === 'PAYBILL').length || 0,
      total_till_transactions: summaryData?.filter(t => t.transaction_type === 'TILLNUMBER').length || 0,
      completed_transactions: summaryData?.filter(t => t.status === 'completed').length || 0,
      failed_transactions: summaryData?.filter(t => t.status === 'failed').length || 0,
      pending_transactions: summaryData?.filter(t => t.status === 'pending').length || 0,
      allocated_transactions: summaryData?.filter(t => t.partner_id).length || 0,
      unallocated_transactions: summaryData?.filter(t => !t.partner_id).length || 0,
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
    console.error('C2B Transactions GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
