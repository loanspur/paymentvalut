import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser || !currentUser.is_active) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found or inactive'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const requestedPartnerId = searchParams.get('partnerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit

    // Build query for disbursement requests based on user role and request
    let disbursementQuery = supabase.from('disbursement_requests').select('*', { count: 'exact' })
    
    if (currentUser.role === 'super_admin') {
      // Super admin can filter by any partner or see all data
      if (requestedPartnerId && requestedPartnerId !== 'all') {
        disbursementQuery = disbursementQuery.eq('partner_id', requestedPartnerId)
      }
    } else if (currentUser.partner_id) {
      // Non-super admin users are limited to their own partner
      disbursementQuery = disbursementQuery.eq('partner_id', currentUser.partner_id)
    }

    // Apply filters
    if (startDate) {
      disbursementQuery = disbursementQuery.gte('created_at', startDate)
    }
    if (endDate) {
      disbursementQuery = disbursementQuery.lte('created_at', endDate)
    }
    if (status && status !== 'all') {
      disbursementQuery = disbursementQuery.eq('status', status)
    }
    if (search) {
      disbursementQuery = disbursementQuery.or(`msisdn.ilike.%${search}%,customer_name.ilike.%${search}%,conversation_id.ilike.%${search}%`)
    }

    // Get disbursement requests with pagination
    const { data: transactions, error, count } = await disbursementQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Get partners data separately - also filter by user role
    let partnersQuery = supabase.from('partners').select('id, name, short_code, mpesa_shortcode')
    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      partnersQuery = partnersQuery.eq('id', currentUser.partner_id)
    }
    const { data: partners, error: partnersError } = await partnersQuery

    if (partnersError) {
      // Error fetching partners
    }

    if (error) {
      // Error fetching recent transactions
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      )
    }

    // Format the transactions for the dashboard
    const formattedTransactions = transactions?.map(transaction => {
      const partner = partners?.find(p => p.id === transaction.partner_id)
      const createdAt = new Date(transaction.created_at)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60))
      
      let timeAgo
      if (diffInMinutes < 1) {
        timeAgo = 'Just now'
      } else if (diffInMinutes < 60) {
        timeAgo = `${diffInMinutes} min ago`
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60)
        timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`
      } else {
        const days = Math.floor(diffInMinutes / 1440)
        timeAgo = `${days} day${days > 1 ? 's' : ''} ago`
      }

      // Clean up result description to remove verbose text
      let cleanResultDesc = transaction.result_desc
      if (cleanResultDesc) {
        // Remove various verbose success messages
        cleanResultDesc = cleanResultDesc
          .replace(/Accept the service request successfully\.?/gi, '')
          .replace(/The service request is processed successfully\.?/gi, '')
          .replace(/Service request processed successfully\.?/gi, '')
          .replace(/The initiator information is invalid\.?/gi, 'Invalid credentials')
          .replace(/Initiator information is invalid\.?/gi, 'Invalid credentials')
          .replace(/Invalid initiator information\.?/gi, 'Invalid credentials')
          .replace(/Success\.?/gi, '')
          .replace(/successful\.?/gi, '')
          .trim()
        
        // If nothing left after cleaning, use a simple message based on result code
        if (!cleanResultDesc) {
          if (transaction.result_code === '0') {
            cleanResultDesc = 'Success'
          } else if (transaction.result_code === '1') {
            cleanResultDesc = 'Pending'
          } else {
            cleanResultDesc = 'Failed'
          }
        }
      }

      // Get M-Pesa transaction ID - prioritize from disbursement_requests table (updated by Edge Function)
      const mpesaTransactionId = transaction.transaction_id || 
                                transaction.receipt_number || 
                                transaction.conversation_id

      // Use customer_name from M-Pesa callback if available, otherwise fallback to customer_id
      const customerName = transaction.customer_name || transaction.customer_id

      return {
        id: transaction.id,
        partner: partner?.name || 'Unknown',
        shortCode: partner?.short_code || partner?.mpesa_shortcode || 'N/A',
        amount: transaction.amount,
        msisdn: transaction.msisdn,
        status: transaction.status,
        resultCode: transaction.result_code,
        resultDesc: cleanResultDesc,
        conversationId: transaction.conversation_id,
        transactionReceipt: transaction.receipt_number || transaction.transaction_receipt,
        mpesaTransactionId: mpesaTransactionId,
        customerName: customerName,
        timeAgo,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,
        // Utility balance data
        utilityBalanceAtTransaction: transaction.utility_balance_at_transaction,
        workingBalanceAtTransaction: transaction.working_balance_at_transaction,
        chargesBalanceAtTransaction: transaction.charges_balance_at_transaction,
        balanceUpdatedAtTransaction: transaction.balance_updated_at_transaction
      }
    }) || []


    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: count || 0,
        recordsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        startRecord: offset + 1,
        endRecord: Math.min(offset + limit, count || 0)
      }
    })

  } catch (error) {
    // Error fetching recent transactions
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
