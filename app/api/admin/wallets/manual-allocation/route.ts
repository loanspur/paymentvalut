import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Get or create wallet for the partner
    let { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partner_id)
      .single()

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('partner_wallets')
        .insert({
          partner_id: partner_id,
          current_balance: 0,
          currency: 'KES',
          low_balance_threshold: 1000,
          sms_notifications_enabled: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating wallet:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create wallet' },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (walletError) {
      console.error('Error fetching wallet:', walletError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    // Check if debit operation would result in negative balance
    const transactionAmount = transaction_type === 'credit' ? amount : -amount
    const newBalance = wallet.current_balance + transactionAmount

    if (newBalance < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient balance. Current: ${wallet.current_balance} KES, Requested: ${amount} KES` 
        },
        { status: 400 }
      )
    }

    // Create wallet transaction record
    const transactionReference = `MANUAL_${transaction_type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    const { data: walletTransaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        transaction_type: `manual_${transaction_type}`,
        amount: transactionAmount,
        reference: transactionReference,
        description: `Manual ${transaction_type} - ${description}`,
        status: 'completed',
        metadata: {
          manual_allocation: true,
          admin_initiated: true,
          original_amount: amount,
          transaction_type: transaction_type,
          description: description,
          processed_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating wallet transaction:', transactionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create transaction record' },
        { status: 500 }
      )
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('partner_wallets')
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)

    if (updateError) {
      console.error('Error updating wallet balance:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update wallet balance' },
        { status: 500 }
      )
    }

    // Log the manual allocation for audit purposes
    console.log('Manual wallet allocation processed:', {
      partner_id: partner_id,
      partner_name: partner.name,
      transaction_type: transaction_type,
      amount: amount,
      transaction_amount: transactionAmount,
      old_balance: wallet.current_balance,
      new_balance: newBalance,
      reference: transactionReference,
      description: description,
      processed_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Manual ${transaction_type} of ${amount} KES processed successfully`,
      data: {
        wallet_transaction: walletTransaction,
        partner: partner,
        old_balance: wallet.current_balance,
        new_balance: newBalance,
        transaction_reference: transactionReference
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

