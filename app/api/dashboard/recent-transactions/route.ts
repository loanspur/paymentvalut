import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')


    // Get recent disbursement requests with all M-Pesa fields
    const { data: transactions, error } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Get partners data separately
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code')

    if (partnersError) {
      console.error('Error fetching partners:', partnersError)
    }

    if (error) {
      console.error('Error fetching recent transactions:', error)
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
        shortCode: partner?.short_code || '',
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
    console.error('❌ Error fetching recent transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
