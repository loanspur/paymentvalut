import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import UnifiedWalletService from '@/lib/unified-wallet-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    let {
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

    // CRITICAL: Check if there's already a pending charge transaction for this disbursement
    // This prevents duplicate charges and ensures we use the existing transaction with related_transaction_id
    let chargeTransaction = null
    if (related_transaction_id && related_transaction_type === 'disbursement') {
      const { data: existingCharge, error: existingError } = await supabase
        .from('partner_charge_transactions')
        .select('*')
        .eq('partner_id', partner_id)
        .eq('related_transaction_id', related_transaction_id)
        .eq('related_transaction_type', 'disbursement')
        .eq('status', 'pending')
        .single()

      if (!existingError && existingCharge) {
        chargeTransaction = existingCharge
      }
    }

    // Create charge transaction record only if one doesn't already exist
    if (!chargeTransaction) {
      const { data: newChargeTransaction, error: transactionError } = await supabase
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
          wallet_balance_after: wallet.current_balance // Will be updated when actually deducted
        })
        .select()
        .single()

      if (transactionError) {
        console.error('[Charge Processing] Error creating charge transaction:', transactionError)
        return NextResponse.json(
          { success: false, error: 'Failed to create charge transaction' },
          { status: 500 }
        )
      }
      chargeTransaction = newChargeTransaction
    }

    // Update wallet balance if automatic deduction is enabled
    // IMPORTANT: Only deduct if related transaction is successful (or no related transaction)
    if (chargeConfig.is_automatic) {
      let shouldDeduct = true
      let deductionReason = 'Automatic charge processing'

      // If related_transaction_id is not provided, try to find it from the charge transaction
      if (!related_transaction_id && chargeTransaction.related_transaction_id) {
        related_transaction_id = chargeTransaction.related_transaction_id
        related_transaction_type = chargeTransaction.related_transaction_type || 'disbursement'
      }

      // If still no related_transaction_id, check if there are pending charges for disbursements
      if (!related_transaction_id) {
        const { data: pendingCharges, error: pendingError } = await supabase
          .from('partner_charge_transactions')
          .select('*')
          .eq('partner_id', partner_id)
          .eq('related_transaction_type', 'disbursement')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1) // Process one at a time to avoid race conditions

        if (!pendingError && pendingCharges && pendingCharges.length > 0) {
          const pendingCharge = pendingCharges[0]
          chargeTransaction = pendingCharge
          related_transaction_id = pendingCharge.related_transaction_id
          related_transaction_type = pendingCharge.related_transaction_type || 'disbursement'
          chargeAmount = pendingCharge.charge_amount || chargeAmount
        }
      }

      // CRITICAL: Always check disbursement status before deducting for disbursement-related charges
      if (related_transaction_id && related_transaction_type === 'disbursement') {
        const { data: disbursement, error: disbursementError } = await supabase
          .from('disbursement_requests')
          .select('status, result_code')
          .eq('id', related_transaction_id)
          .single()

        if (disbursementError || !disbursement) {
          shouldDeduct = false
          deductionReason = 'Related disbursement not found - will be processed when disbursement completes'
        } else if (disbursement.status !== 'success') {
          shouldDeduct = false
          deductionReason = `Related disbursement status is '${disbursement.status}' (not 'success') - will be processed when disbursement succeeds`
        } else {
          deductionReason = 'Related disbursement is successful'
        }
      } else if (charge_type === 'disbursement' || chargeTransaction?.related_transaction_type === 'disbursement') {
        // If charge_type is 'disbursement' but no related_transaction_id, DO NOT proceed
        shouldDeduct = false
        deductionReason = 'Disbursement charge cannot be processed without related_transaction_id - need to verify disbursement status first'
      }

      if (shouldDeduct) {
        if (wallet.current_balance < chargeAmount) {
          await supabase
            .from('partner_charge_transactions')
            .update({ 
              status: 'failed',
              metadata: {
                ...(chargeTransaction.metadata || {}),
                failure_reason: `Insufficient wallet balance. Required: ${chargeAmount} KES, Available: ${wallet.current_balance} KES`
              }
            })
            .eq('id', chargeTransaction.id)
          
          return NextResponse.json(
            { 
              success: false, 
              error: `Insufficient wallet balance. Required: ${chargeAmount} KES, Available: ${wallet.current_balance} KES` 
            },
            { status: 400 }
          )
        }

        const balanceResult = await UnifiedWalletService.updateWalletBalance(
          partner_id,
          -chargeAmount, // Negative amount for deduction
          'charge',
          {
            reference: `CHARGE_${chargeTransaction.id}`,
            description: `${chargeConfig.charge_name} - ${description || 'Automatic charge'}`,
            charge_transaction_id: chargeTransaction.id,
            charge_config_id: chargeConfig.id,
            related_transaction_id,
            related_transaction_type,
            automatic: chargeConfig.is_automatic,
            deduction_reason: deductionReason
          }
        )

        if (!balanceResult.success) {
          console.error('[Charge Processing] Error updating wallet balance:', balanceResult.error)
          await supabase
            .from('partner_charge_transactions')
            .update({ 
              status: 'failed',
              metadata: {
                ...(chargeTransaction.metadata || {}),
                failure_reason: balanceResult.error
              }
            })
            .eq('id', chargeTransaction.id)
          
          return NextResponse.json(
            { success: false, error: balanceResult.error },
            { status: 500 }
          )
        }

        // Update charge transaction status to completed and set correct wallet_balance_after
        const { error: statusError } = await supabase
          .from('partner_charge_transactions')
          .update({ 
            status: 'completed',
            wallet_balance_after: balanceResult.newBalance, // Set actual balance after deduction
            processed_at: new Date().toISOString()
          })
          .eq('id', chargeTransaction.id)

        if (statusError) {
          console.error('[Charge Processing] Error updating charge transaction status:', statusError)
        }
      } else {
        // Don't deduct yet - keep status as pending
        const { error: metadataError } = await supabase
          .from('partner_charge_transactions')
          .update({
            metadata: {
              ...(chargeTransaction.metadata || {}),
              deduction_deferred: true,
              deduction_reason: deductionReason,
              deferred_at: new Date().toISOString()
            }
          })
          .eq('id', chargeTransaction.id)

        if (metadataError) {
          console.error('[Charge Processing] Error updating charge transaction metadata:', metadataError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Charge of ${chargeAmount} KES processed successfully`,
      data: {
        charge_transaction: chargeTransaction,
        charge_amount: chargeAmount,
        old_balance: wallet.current_balance,
        new_balance: chargeConfig.is_automatic ? wallet.current_balance - chargeAmount : wallet.current_balance,
        automatic: chargeConfig.is_automatic
      }
    })

  } catch (error) {
    console.error('[Charge Processing] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}