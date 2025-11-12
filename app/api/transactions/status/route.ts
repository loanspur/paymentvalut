import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get transaction status and recent transactions
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid session' },
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
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const requestedPartnerId = searchParams.get('partner_id')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Determine which partner's transactions to query - SECURITY: Enforce partner isolation
    let partnerId: string | null = null
    
    if (user.role === 'super_admin') {
      // Only super_admin can query any partner
      partnerId = requestedPartnerId || null
    } else {
      // All other users (including admin) can only access their own partner
      if (!user.partner_id) {
        return NextResponse.json(
          { error: 'No partner assigned to user' },
          { status: 400 }
        )
      }
      
      partnerId = user.partner_id
      
      // If they requested a different partner, deny access
      if (requestedPartnerId && requestedPartnerId !== user.partner_id) {
        return NextResponse.json(
          { error: 'Access denied: You can only view your own partner\'s transactions' },
          { status: 403 }
        )
      }
    }

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Get recent disbursement transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('disbursement_requests')
      .select(`
        id,
        origin,
        tenant_id,
        customer_id,
        client_request_id,
        msisdn,
        amount,
        status,
        conversation_id,
        transaction_receipt,
        result_code,
        result_desc,
        partner_id,
        created_at,
        updated_at
      `)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
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

    // Add partner info to transactions
    const transactionsWithPartner = transactions?.map(transaction => ({
      ...transaction,
      partners: partner || { id: partnerId, name: 'Unknown Partner', mpesa_shortcode: 'N/A' }
    })) || []

    // Get transaction statistics
    const { data: stats, error: statsError } = await supabase
      .from('disbursement_requests')
      .select('status, amount')
      .eq('partner_id', partnerId)

    if (statsError) {
      console.error('Error fetching transaction stats:', statsError)
    }

    // Calculate statistics
    const totalTransactions = stats?.length || 0
    const successfulTransactions = stats?.filter(t => t.status === 'success').length || 0
    const pendingTransactions = stats?.filter(t => t.status === 'queued' || t.status === 'pending').length || 0
    const failedTransactions = stats?.filter(t => t.status === 'failed').length || 0
    const totalAmount = stats?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0
    const successfulAmount = stats?.filter(t => t.status === 'success').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0

    return NextResponse.json({
      success: true,
      transactions: transactionsWithPartner,
      statistics: {
        total: totalTransactions,
        successful: successfulTransactions,
        pending: pendingTransactions,
        failed: failedTransactions,
        totalAmount: totalAmount,
        successfulAmount: successfulAmount,
        successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions * 100).toFixed(1) : '0'
      }
    })

  } catch (error) {
    console.error('Transaction status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
