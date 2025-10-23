import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const {
      partner_id,
      charge_type,
      related_transaction_id,
      related_transaction_type,
      transaction_amount = 0,
      description
    } = await request.json()

    if (!partner_id || !charge_type) {
      return NextResponse.json(
        { success: false, error: 'partner_id and charge_type are required' },
        { status: 400 }
      )
    }

    // Get the charge configuration for this partner and charge type
    const { data: chargeConfig, error: configError } = await supabase
      .from('partner_charges_config')
      .select('*')
      .eq('partner_id', partner_id)
      .eq('charge_type', charge_type)
      .eq('is_active', true)
      .single()

    if (configError || !chargeConfig) {
      return NextResponse.json(
        { success: false, error: `No active charge configuration found for ${charge_type}` },
        { status: 404 }
      )
    }

    // Calculate the charge amount
    let chargeAmount = chargeConfig.charge_amount || 0

    // Apply percentage if specified
    if (chargeConfig.charge_percentage && transaction_amount > 0) {
      const percentageAmount = (transaction_amount * chargeConfig.charge_percentage) / 100
      chargeAmount = Math.max(chargeAmount, percentageAmount)
    }

    // Apply minimum and maximum limits
    if (chargeConfig.minimum_charge && chargeAmount < chargeConfig.minimum_charge) {
      chargeAmount = chargeConfig.minimum_charge
    }
    if (chargeConfig.maximum_charge && chargeAmount > chargeConfig.maximum_charge) {
      chargeAmount = chargeConfig.maximum_charge
    }

    // Get partner wallet
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partner_id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Partner wallet not found' },
        { status: 404 }
      )
    }

    // Check if wallet has sufficient balance
    if (wallet.current_balance < chargeAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient wallet balance. Required: ${chargeAmount} KES, Available: ${wallet.current_balance} KES` 
        },
        { status: 400 }
      )
    }

    // Calculate new wallet balance
    const newBalance = wallet.current_balance - chargeAmount

    // Create charge transaction record
    const { data: chargeTransaction, error: transactionError } = await supabase
      .from('partner_charge_transactions')
      .insert({
        partner_id,
        wallet_id: wallet.id,
        charge_config_id: chargeConfig.id,
        related_transaction_id,
        related_transaction_type,
        charge_amount: chargeAmount,
        charge_type,
        charge_name: chargeConfig.charge_name,
        description: description || `Automatic charge for ${charge_type}`,
        status: 'pending',
        wallet_balance_before: wallet.current_balance,
        wallet_balance_after: newBalance
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating charge transaction:', transactionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create charge transaction' },
        { status: 500 }
      )
    }

    // Update wallet balance if automatic deduction is enabled
    if (chargeConfig.is_automatic) {
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

      // Update charge transaction status to completed
      const { error: statusError } = await supabase
        .from('partner_charge_transactions')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', chargeTransaction.id)

      if (statusError) {
        console.error('Error updating charge transaction status:', statusError)
      }
    }

    // Create wallet transaction record for the charge
    const { error: walletTransactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        transaction_type: 'charge',
        amount: -chargeAmount,
        reference: `CHARGE_${chargeTransaction.id}`,
        description: `${chargeConfig.charge_name} - ${description || 'Automatic charge'}`,
        status: chargeConfig.is_automatic ? 'completed' : 'pending',
        metadata: {
          charge_transaction_id: chargeTransaction.id,
          charge_config_id: chargeConfig.id,
          related_transaction_id,
          related_transaction_type,
          automatic: chargeConfig.is_automatic
        }
      })

    if (walletTransactionError) {
      console.error('Error creating wallet transaction:', walletTransactionError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: `Charge of ${chargeAmount} KES processed successfully`,
      data: {
        charge_transaction: chargeTransaction,
        charge_amount: chargeAmount,
        old_balance: wallet.current_balance,
        new_balance: newBalance,
        automatic: chargeConfig.is_automatic
      }
    })

  } catch (error) {
    console.error('Process Charge Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

