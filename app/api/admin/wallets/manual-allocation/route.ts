import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import UnifiedWalletService from '@/lib/unified-wallet-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { partner_id, amount, description, transaction_type } = await request.json()

    if (!partner_id || !amount || !description || !transaction_type) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    if (!['credit', 'debit'].includes(transaction_type)) {
      return NextResponse.json(
        { success: false, error: 'Transaction type must be credit or debit' },
        { status: 400 }
      )
    }

    // Get partner information
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partner_id)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Prepare amount sign and transaction type mapping
    const isCredit = transaction_type === 'credit'
    const delta = isCredit ? amount : -amount
    const unifiedType = isCredit ? 'manual_credit' : 'manual_debit'
    const transactionReference = `MANUAL_${transaction_type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const result = await UnifiedWalletService.updateWalletBalance(
      partner_id,
      delta,
      unifiedType,
      {
        reference: transactionReference,
        description: `Manual ${transaction_type} - ${description}`,
        manual_allocation: true,
        admin_initiated: true,
        original_amount: amount,
        processed_at: new Date().toISOString()
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update wallet balance' },
        { status: 400 }
      )
    }

    // Log the manual allocation for audit purposes
    console.log('Manual wallet allocation processed:', {
      partner_id: partner_id,
      partner_name: partner.name,
      transaction_type: transaction_type,
      amount: amount,
      transaction_amount: delta,
      old_balance: result.previousBalance,
      new_balance: result.newBalance,
      reference: transactionReference,
      description: description,
      processed_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Manual ${transaction_type} of ${amount} KES processed successfully`,
      data: {
        partner,
        old_balance: result.previousBalance,
        new_balance: result.newBalance,
        transaction_type: unifiedType
      }
    })

  } catch (error) {
    console.error('Manual Allocation Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}








