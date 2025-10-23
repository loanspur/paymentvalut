import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { amount, phone_number } = await request.json()

    if (!amount || !phone_number) {
      return NextResponse.json(
        { success: false, error: 'Amount and phone number are required' },
        { status: 400 }
      )
    }

    if (amount < 1) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get the current user's partner (for now, get first partner as demo)
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id')
      .limit(1)
      .single()

    if (partnersError || !partners) {
      return NextResponse.json(
        { success: false, error: 'No partner found' },
        { status: 404 }
      )
    }

    // Get or create wallet for the partner
    let { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partners.id)
      .single()

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('partner_wallets')
        .insert({
          partner_id: partners.id,
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

    // Create wallet transaction record
    const { data: walletTransaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        transaction_type: 'top_up',
        amount: amount,
        currency: 'KES',
        status: 'pending',
        description: `Wallet top-up via NCBA STK Push - ${phone_number}`,
        reference: `TOPUP_${Date.now()}`,
        metadata: {
          phone_number: phone_number,
          stk_push_initiated: true,
          initiated_at: new Date().toISOString()
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

    // Create STK Push log record
    const stkPushTransactionId = `STK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const { data: stkPushLog, error: stkPushError } = await supabase
      .from('ncb_stk_push_logs')
      .insert({
        partner_id: partners.id,
        wallet_transaction_id: walletTransaction.id,
        stk_push_transaction_id: stkPushTransactionId,
        partner_phone: phone_number,
        amount: amount,
        ncb_paybill_number: '880100',
        ncb_account_number: '123456', // This should come from system settings
        stk_push_status: 'initiated',
        ncb_response: {
          status: 'initiated',
          message: 'STK Push initiated successfully',
          transaction_id: stkPushTransactionId
        }
      })
      .select()
      .single()

    if (stkPushError) {
      console.error('Error creating STK Push log:', stkPushError)
      // Don't fail the request, just log the error
    }

    // TODO: Integrate with actual NCBA STK Push API
    // For now, we'll simulate the STK Push initiation
    console.log('STK Push initiated:', {
      phone_number,
      amount,
      transaction_id: stkPushTransactionId,
      wallet_transaction_id: walletTransaction.id
    })

    return NextResponse.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        wallet_transaction: walletTransaction,
        stk_push_log: stkPushLog,
        stk_push_transaction_id: stkPushTransactionId
      }
    })

  } catch (error) {
    console.error('STK Push Top-up Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}