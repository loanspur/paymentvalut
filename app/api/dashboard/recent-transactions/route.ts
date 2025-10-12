import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

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
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')
    const { payload } = await jwtVerify(token, secret)
    
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
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query for disbursement requests based on user role
    let disbursementQuery = supabase.from('disbursement_requests').select('*')
    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      disbursementQuery = disbursementQuery.eq('partner_id', currentUser.partner_id)
    }

    // Get recent disbursement requests with all M-Pesa fields
    const { data: transactions, error } = await disbursementQuery
      .order('created_at', { ascending: false })
      .limit(limit)

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


    return NextResponse.json({
      success: true,
      data: formattedTransactions
    })

  } catch (error) {
    // Error fetching recent transactions
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
