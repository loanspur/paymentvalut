import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Update partner wallet balance
    try {
      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('partner_wallets')
        .select('*')
        .eq('partner_id', partner_id)
        .single()

      let currentBalance = 0
      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletError)
      } else if (wallet) {
        currentBalance = wallet.balance || 0
      } else {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('partner_wallets')
          .insert({
            partner_id: partner_id,
            balance: 0,
            currency: 'KES',
            is_active: true
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating wallet:', createError)
        } else {
          currentBalance = 0
        }
      }

      // Update wallet balance
      const newBalance = currentBalance + transaction.transaction_amount
      const { error: balanceError } = await supabase
        .from('partner_wallets')
        .upsert({
          partner_id: partner_id,
          balance: newBalance,
          currency: 'KES',
          is_active: true,
          updated_at: new Date().toISOString()
        })

      if (balanceError) {
        console.error('Error updating wallet balance:', balanceError)
      } else {
        console.log(`Wallet balance updated for partner ${partner.name}: ${currentBalance} -> ${newBalance}`)
      }

      // Create wallet transaction record
      const { data: walletTransaction, error: walletTransactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          partner_id: partner_id,
          transaction_type: 'top_up',
          amount: transaction.transaction_amount,
          currency: 'KES',
          status: 'completed',
          reference: transaction.transaction_id,
          description: `Wallet top-up via NCBA Paybill - ${transaction.bill_reference_number}`,
          metadata: {
            c2b_transaction_id: transaction.id,
            transaction_type: transaction.transaction_type,
            business_short_code: transaction.business_short_code,
            bill_reference: transaction.bill_reference_number,
            customer_phone: transaction.customer_phone,
            customer_name: transaction.customer_name,
            source: 'ncba_paybill_allocation'
          }
        })
        .select()
        .single()

      if (walletTransactionError) {
        console.error('Error creating wallet transaction:', walletTransactionError)
      }
    } catch (walletError) {
      console.error('Error processing wallet update:', walletError)
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








