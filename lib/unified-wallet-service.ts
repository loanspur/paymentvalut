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

const toNumber = (value: any): number => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') {
      return 0
    }

    const parsed = parseFloat(trimmed.replace(/,/g, ''))
    return Number.isNaN(parsed) ? 0 : parsed
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  return 0
}

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
    amount: number | string,
    transactionType: string,
    metadata?: Record<string, any>
  ): Promise<WalletBalanceUpdateResult> {
    const normalizedAmount = toNumber(amount)

    if (Number.isNaN(normalizedAmount)) {
      return {
        success: false,
        partnerId,
        amount: 0,
        transactionType,
        error: 'Invalid amount provided for wallet update'
      }
    }

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
        console.error('[UnifiedWalletService] Error fetching wallet:', walletError)
        return {
          success: false,
          partnerId,
          amount: normalizedAmount,
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
            amount: normalizedAmount,
            transactionType,
            error: `Failed to create wallet: ${createError.message}`
          }
        }

        wallet = newWallet
        walletId = wallet.id
        currentBalance = 0
      } else {
        walletId = wallet.id
        currentBalance = toNumber(wallet.current_balance)
      }

      // Calculate new balance
      const newBalance = currentBalance + normalizedAmount

      // Validate balance (prevent negative balances for charges)
      if (transactionType === 'charge' || transactionType === 'sms_charge' || transactionType === 'disbursement') {
        if (newBalance < 0) {
          return {
            success: false,
            walletId,
            partnerId,
            previousBalance: currentBalance,
            amount: normalizedAmount,
            transactionType,
            error: `Insufficient balance. Required: ${Math.abs(normalizedAmount)} KES, Available: ${currentBalance} KES`
          }
        }
      }

      // CRITICAL CHECK: If this is a charge related to a disbursement, verify disbursement status
      if (transactionType === 'charge' && metadata?.related_transaction_id && metadata?.related_transaction_type === 'disbursement') {
        const { data: relatedDisbursement, error: disbursementCheckError } = await supabase
          .from('disbursement_requests')
          .select('id, status, result_code')
          .eq('id', metadata.related_transaction_id)
          .single()
        
        if (!disbursementCheckError && relatedDisbursement && relatedDisbursement.status !== 'success') {
          return {
            success: false,
            walletId,
            partnerId,
            previousBalance: currentBalance,
            amount: normalizedAmount,
            transactionType,
            error: `Cannot deduct wallet: Related disbursement status is '${relatedDisbursement.status}', not 'success'`
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
        // Use original_amount from metadata if available (for manual credits), otherwise use absolute value of normalizedAmount
        // This ensures we always store the positive credit amount, not the delta
        updateData.last_topup_amount = metadata?.original_amount 
          ? toNumber(metadata.original_amount) 
          : Math.abs(normalizedAmount)
      }

      const { error: balanceError } = await supabase
        .from('partner_wallets')
        .update(updateData)
        .eq('id', walletId)

      if (balanceError) {
        console.error('[UnifiedWalletService] Error updating wallet balance:', balanceError)
        return {
          success: false,
          walletId,
          partnerId,
          previousBalance: currentBalance,
          amount: normalizedAmount,
          transactionType,
          error: `Failed to update wallet balance: ${balanceError.message}`
        }
      }

      // Create wallet transaction record
      const transactionData: WalletTransactionData = {
        walletId,
        transactionType: transactionType as any,
        amount: normalizedAmount,
        reference: metadata?.reference,
        description: metadata?.description,
        metadata: {
          ...(metadata || {}),
          wallet_balance_after: newBalance
        }
      }

      const transactionResult = await this.createWalletTransaction(transactionData, wallet.currency || 'KES')

      if (!transactionResult) {
        console.error('[UnifiedWalletService] Failed to create wallet transaction, but balance was updated')
      }

      return {
        success: true,
        walletId,
        partnerId,
        previousBalance: currentBalance,
        newBalance,
        amount: normalizedAmount,
        transactionType
      }

    } catch (error) {
      console.error('[UnifiedWalletService] Exception:', error)
      return {
        success: false,
        partnerId,
        amount: normalizedAmount,
        transactionType,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Create wallet transaction record
   * IMPORTANT: This method only creates the transaction record - it does NOT update wallet balance
   * Wallet balance should only be updated via updateWalletBalance() method
   */
  static async createWalletTransaction(transactionData: WalletTransactionData, currency: string = 'KES', status: string = 'completed'): Promise<boolean> {
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
          status: status, // Allow status to be specified (e.g., 'pending' for deferred charges)
          metadata: transactionData.metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('[UnifiedWalletService] Error creating wallet transaction:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('[UnifiedWalletService] Exception creating wallet transaction:', error)
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
        balance: wallet ? toNumber(wallet.current_balance) : 0,
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
