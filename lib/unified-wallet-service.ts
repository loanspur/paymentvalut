/**
 * UNIFIED WALLET SERVICE
 * Single source of truth for all wallet operations
 * Replaces all inconsistent implementations across the codebase
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WalletBalanceUpdateResult {
  success: boolean
  walletId?: string
  partnerId?: string
  previousBalance?: number
  newBalance?: number
  amount?: number
  transactionType?: string
  error?: string
}

export interface WalletTransactionData {
  walletId: string
  transactionType: 'top_up' | 'disbursement' | 'b2c_float_purchase' | 'charge' | 'sms_charge' | 'manual_credit' | 'manual_debit'
  amount: number
  reference?: string
  description?: string
  metadata?: Record<string, any>
}

export class UnifiedWalletService {
  /**
   * Update wallet balance - SINGLE SOURCE OF TRUTH
   * This method replaces all other wallet balance update implementations
   */
  static async updateWalletBalance(
    partnerId: string,
    amount: number,
    transactionType: string,
    metadata?: Record<string, any>
  ): Promise<WalletBalanceUpdateResult> {
    try {
      // Get or create wallet for the partner
      let { data: wallet, error: walletError } = await supabase
        .from('partner_wallets')
        .select('*')
        .eq('partner_id', partnerId)
        .single()

      let walletId: string
      let currentBalance = 0

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('❌ Error fetching wallet:', walletError)
        return {
          success: false,
          partnerId,
          amount,
          transactionType,
          error: `Failed to fetch wallet: ${walletError.message}`
        }
      }

      if (!wallet) {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('partner_wallets')
          .insert({
            partner_id: partnerId,
            current_balance: 0,
            currency: 'KES',
            is_active: true,
            low_balance_threshold: 1000,
            sms_notifications_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ Error creating wallet:', createError)
          return {
            success: false,
            partnerId,
            amount,
            transactionType,
            error: `Failed to create wallet: ${createError.message}`
          }
        }

        wallet = newWallet
        walletId = wallet.id
        currentBalance = 0
      } else {
        walletId = wallet.id
        currentBalance = wallet.current_balance || 0
      }

      // Calculate new balance
      const newBalance = currentBalance + amount

      // Validate balance (prevent negative balances for charges)
      if (transactionType === 'charge' || transactionType === 'sms_charge' || transactionType === 'disbursement') {
        if (newBalance < 0) {
          return {
            success: false,
            walletId,
            partnerId,
            previousBalance: currentBalance,
            amount,
            transactionType,
            error: `Insufficient balance. Required: ${Math.abs(amount)} KES, Available: ${currentBalance} KES`
          }
        }
      }

      // Update wallet balance
      const updateData: any = {
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      }

      // Update topup fields if this is a topup transaction
      if (transactionType === 'top_up' || transactionType === 'manual_credit') {
        updateData.last_topup_date = new Date().toISOString()
        updateData.last_topup_amount = amount
      }

      const { error: balanceError } = await supabase
        .from('partner_wallets')
        .update(updateData)
        .eq('id', walletId)

      if (balanceError) {
        console.error('❌ Error updating wallet balance:', balanceError)
        return {
          success: false,
          walletId,
          partnerId,
          previousBalance: currentBalance,
          amount,
          transactionType,
          error: `Failed to update wallet balance: ${balanceError.message}`
        }
      }

      // Create wallet transaction record (include resulting balance for easy reads)
      const transactionData: WalletTransactionData = {
        walletId,
        transactionType: transactionType as any,
        amount,
        reference: metadata?.reference,
        description: metadata?.description,
        metadata: {
          ...(metadata || {}),
          wallet_balance_after: newBalance
        }
      }

      const transactionResult = await this.createWalletTransaction(transactionData, wallet.currency || 'KES')

      if (!transactionResult) {
        console.error('❌ Failed to create wallet transaction, but balance was updated')
        // Balance was already updated, so we still return success but log the error
        // The transaction record is important for audit trail, but we don't want to fail the entire operation
      }

      return {
        success: true,
        walletId,
        partnerId,
        previousBalance: currentBalance,
        newBalance,
        amount,
        transactionType
      }

    } catch (error) {
      console.error('❌ UnifiedWalletService.updateWalletBalance Exception:', error)
      return {
        success: false,
        partnerId,
        amount,
        transactionType,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Create wallet transaction record
   */
  static async createWalletTransaction(transactionData: WalletTransactionData, currency: string = 'KES'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: transactionData.walletId,
          transaction_type: transactionData.transactionType,
          amount: transactionData.amount,
          currency: currency,
          reference: transactionData.reference,
          description: transactionData.description,
          status: 'completed',
          metadata: transactionData.metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating wallet transaction:', error)
        console.error('❌ Transaction data:', {
          wallet_id: transactionData.walletId,
          transaction_type: transactionData.transactionType,
          amount: transactionData.amount,
          reference: transactionData.reference,
          description: transactionData.description
        })
        return false
      }

      console.log('✅ Wallet transaction created successfully:', {
        transaction_id: data?.id,
        wallet_id: transactionData.walletId,
        transaction_type: transactionData.transactionType,
        amount: transactionData.amount,
        reference: transactionData.reference
      })

      return true

    } catch (error) {
      console.error('❌ UnifiedWalletService.createWalletTransaction Exception:', error)
      return false
    }
  }

  /**
   * Get wallet balance for a partner
   */
  static async getWalletBalance(partnerId: string): Promise<{ balance: number; walletId?: string }> {
    try {
      const { data: wallet, error } = await supabase
        .from('partner_wallets')
        .select('id, current_balance')
        .eq('partner_id', partnerId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching wallet balance:', error)
        return { balance: 0 }
      }

      return {
        balance: wallet?.current_balance || 0,
        walletId: wallet?.id
      }

    } catch (error) {
      console.error('❌ UnifiedWalletService.getWalletBalance Exception:', error)
      return { balance: 0 }
    }
  }

  /**
   * Check if partner has sufficient balance
   */
  static async hasSufficientBalance(partnerId: string, requiredAmount: number): Promise<boolean> {
    const { balance } = await this.getWalletBalance(partnerId)
    return balance >= requiredAmount
  }
}

export default UnifiedWalletService
