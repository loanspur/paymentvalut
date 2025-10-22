import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user's partner ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.partner_id) {
      return NextResponse.json({ error: 'No partner associated with user' }, { status: 400 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const transactionType = url.searchParams.get('type')

    // Get wallet ID
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('id')
      .eq('partner_id', user.partner_id)
      .single()

    if (walletError) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by transaction type if specified
    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', wallet.id)

    if (transactionType) {
      countQuery = countQuery.eq('transaction_type', transactionType)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Count fetch error:', countError)
    }

    // Format transactions
    const formattedTransactions = transactions.map((transaction: any) => ({
      id: transaction.id,
      walletId: transaction.wallet_id,
      transactionType: transaction.transaction_type,
      amount: parseFloat(transaction.amount),
      reference: transaction.reference,
      description: transaction.description,
      floatAmount: transaction.float_amount ? parseFloat(transaction.float_amount) : undefined,
      transferFee: transaction.transfer_fee ? parseFloat(transaction.transfer_fee) : undefined,
      processingFee: transaction.processing_fee ? parseFloat(transaction.processing_fee) : undefined,
      ncbTransferReference: transaction.ncb_transfer_reference,
      ncbFloatReference: transaction.ncb_float_reference,
      otpReference: transaction.otp_reference,
      otpValidated: transaction.otp_validated,
      otpValidatedAt: transaction.otp_validated_at,
      authorizedUserId: transaction.authorized_user_id,
      stkPushTransactionId: transaction.stk_push_transaction_id,
      ncbPaybillNumber: transaction.ncb_paybill_number,
      ncbAccountNumber: transaction.ncb_account_number,
      stkPushStatus: transaction.stk_push_status,
      ncbReferenceId: transaction.ncb_reference_id,
      status: transaction.status,
      smsSent: transaction.sms_sent,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    }))

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Wallet transactions error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

