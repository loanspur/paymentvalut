import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import UnifiedWalletService from '@/lib/unified-wallet-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { partner_id } = await request.json()
    const transactionId = params.id

    if (!partner_id) {
      return NextResponse.json(
        { success: false, error: 'partner_id is required' },
        { status: 400 }
      )
    }

    // Verify the transaction exists
    const { data: transaction, error: transactionError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify the partner exists and is active
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, is_active')
      .eq('id', partner_id)
      .eq('is_active', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found or inactive' },
        { status: 404 }
      )
    }

    // Check if transaction is already allocated
    if (transaction.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Transaction is already allocated to a partner' },
        { status: 400 }
      )
    }

    // Update the transaction with partner allocation
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('c2b_transactions')
      .update({
        partner_id: partner_id,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to allocate partner' },
        { status: 500 }
      )
    }

    // Update partner wallet balance using unified service
    try {
      const balanceResult = await UnifiedWalletService.updateWalletBalance(
        partner_id,
        transaction.transaction_amount,
        'top_up',
        {
          reference: `C2B_${transactionId}`,
          description: `C2B allocation from ${transaction.msisdn}`,
          c2b_transaction_id: transactionId,
          customer_name: transaction.customer_name,
          phone_number: transaction.msisdn,
          original_amount: transaction.transaction_amount
        }
      )

      if (!balanceResult.success) {
        console.error('Error updating wallet balance:', balanceResult.error)
        return NextResponse.json(
          { success: false, error: balanceResult.error },
          { status: 500 }
        )
      }
    } catch (walletError) {
      console.error('Error processing wallet update:', walletError)
      return NextResponse.json(
        { success: false, error: 'Failed to update wallet balance' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Partner allocated successfully',
      data: {
        transaction: updatedTransaction,
        partner: partner
      }
    })

  } catch (error) {
    console.error('Partner Allocation Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}








