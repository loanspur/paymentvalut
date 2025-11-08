/**
 * DEPRECATED: This wallet service is being replaced by UnifiedWalletService
 * Please use lib/unified-wallet-service.ts for all new wallet operations
 * This file is kept for backward compatibility with existing edge functions
 */

// Wallet Management Service
// This module handles wallet operations, balance tracking, and transaction management
// Date: December 2024
// Version: 1.0

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface Wallet {
  id: string;
  partnerId: string;
  currentBalance: number;
  currency: string;
  lastTopupDate?: string;
  lastTopupAmount?: number;
  lowBalanceThreshold: number;
  smsNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  transactionType: 'topup' | 'disbursement' | 'b2c_float_purchase' | 'charge';
  amount: number;
  reference?: string;
  description?: string;
  floatAmount?: number;
  transferFee?: number;
  processingFee?: number;
  ncbTransferReference?: string;
  ncbFloatReference?: string;
  otpReference?: string;
  otpValidated: boolean;
  otpValidatedAt?: string;
  authorizedUserId?: string;
  stkPushTransactionId?: string;
  ncbPaybillNumber?: string;
  ncbAccountNumber?: string;
  stkPushStatus?: 'initiated' | 'pending' | 'completed' | 'failed';
  ncbReferenceId?: string;
  status: 'pending' | 'otp_required' | 'completed' | 'failed';
  smsSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface B2CFloatBalance {
  id: string;
  partnerId: string;
  currentFloatBalance: number;
  lastPurchaseDate?: string;
  lastPurchaseAmount?: number;
  totalPurchased: number;
  totalUsed: number;
  ncbAccountReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTopupRequest {
  partnerId: string;
  amount: number;
  phoneNumber: string;
  description?: string;
}

export interface WalletTopupResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  message?: string;
  error?: string;
}

export interface B2CFloatPurchaseRequest {
  partnerId: string;
  floatAmount: number;
  transferFee: number;
  processingFee: number;
  otpReference: string;
  otpCode: string;
  description?: string;
}

export interface B2CFloatPurchaseResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  message?: string;
  error?: string;
}

export class WalletService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Get partner wallet
   */
  async getPartnerWallet(partnerId: string): Promise<Wallet | null> {
    try {
      const { data, error } = await this.supabase
        .from('partner_wallets')
        .select('*')
        .eq('partner_id', partnerId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        partnerId: data.partner_id,
        currentBalance: parseFloat(data.current_balance),
        currency: data.currency,
        lastTopupDate: data.last_topup_date,
        lastTopupAmount: data.last_topup_amount ? parseFloat(data.last_topup_amount) : undefined,
        lowBalanceThreshold: parseFloat(data.low_balance_threshold),
        smsNotificationsEnabled: data.sms_notifications_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Get Partner Wallet Error:', error);
      return null;
    }
  }

  /**
   * Create partner wallet if it doesn't exist
   */
  async createPartnerWallet(partnerId: string, initialBalance: number = 0): Promise<Wallet | null> {
    try {
      const { data, error } = await this.supabase
        .from('partner_wallets')
        .insert({
          partner_id: partnerId,
          current_balance: initialBalance,
          currency: 'KES',
          low_balance_threshold: 1000,
          sms_notifications_enabled: true
        })
        .select()
        .single();

      if (error) {
        console.error('Create Partner Wallet Error:', error);
        return null;
      }

      return {
        id: data.id,
        partnerId: data.partner_id,
        currentBalance: parseFloat(data.current_balance),
        currency: data.currency,
        lastTopupDate: data.last_topup_date,
        lastTopupAmount: data.last_topup_amount ? parseFloat(data.last_topup_amount) : undefined,
        lowBalanceThreshold: parseFloat(data.low_balance_threshold),
        smsNotificationsEnabled: data.sms_notifications_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Create Partner Wallet Exception:', error);
      return null;
    }
  }

  /**
   * Get or create partner wallet
   */
  async getOrCreatePartnerWallet(partnerId: string): Promise<Wallet | null> {
    let wallet = await this.getPartnerWallet(partnerId);
    
    if (!wallet) {
      wallet = await this.createPartnerWallet(partnerId);
    }
    
    return wallet;
  }

  /**
   * Update wallet balance
   * ⚠️ DEPRECATED: This method bypasses UnifiedWalletService and its checks
   * Use UnifiedWalletService.updateWalletBalance() instead for all wallet updates
   */
  async updateWalletBalance(walletId: string, newBalance: number, lastTopupAmount?: number): Promise<boolean> {
    try {
      const updateData: any = {
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      };

      if (lastTopupAmount) {
        updateData.last_topup_date = new Date().toISOString();
        updateData.last_topup_amount = lastTopupAmount;
      }

      const { error } = await this.supabase
        .from('partner_wallets')
        .update(updateData)
        .eq('id', walletId);

      if (error) {
        console.error('[WalletService] Error updating wallet balance:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WalletService] Exception:', error);
      return false;
    }
  }

  /**
   * Create wallet transaction
   */
  async createWalletTransaction(transaction: Partial<WalletTransaction>): Promise<WalletTransaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: transaction.walletId,
          transaction_type: transaction.transactionType,
          amount: transaction.amount,
          reference: transaction.reference,
          description: transaction.description,
          float_amount: transaction.floatAmount,
          transfer_fee: transaction.transferFee,
          processing_fee: transaction.processingFee,
          ncb_transfer_reference: transaction.ncbTransferReference,
          ncb_float_reference: transaction.ncbFloatReference,
          otp_reference: transaction.otpReference,
          otp_validated: transaction.otpValidated || false,
          otp_validated_at: transaction.otpValidatedAt,
          authorized_user_id: transaction.authorizedUserId,
          stk_push_transaction_id: transaction.stkPushTransactionId,
          ncb_paybill_number: transaction.ncbPaybillNumber,
          ncb_account_number: transaction.ncbAccountNumber,
          stk_push_status: transaction.stkPushStatus,
          ncb_reference_id: transaction.ncbReferenceId,
          status: transaction.status || 'pending',
          sms_sent: transaction.smsSent || false
        })
        .select()
        .single();

      if (error) {
        console.error('Create Wallet Transaction Error:', error);
        return null;
      }

      return {
        id: data.id,
        walletId: data.wallet_id,
        transactionType: data.transaction_type,
        amount: parseFloat(data.amount),
        reference: data.reference,
        description: data.description,
        floatAmount: data.float_amount ? parseFloat(data.float_amount) : undefined,
        transferFee: data.transfer_fee ? parseFloat(data.transfer_fee) : undefined,
        processingFee: data.processing_fee ? parseFloat(data.processing_fee) : undefined,
        ncbTransferReference: data.ncb_transfer_reference,
        ncbFloatReference: data.ncb_float_reference,
        otpReference: data.otp_reference,
        otpValidated: data.otp_validated,
        otpValidatedAt: data.otp_validated_at,
        authorizedUserId: data.authorized_user_id,
        stkPushTransactionId: data.stk_push_transaction_id,
        ncbPaybillNumber: data.ncb_paybill_number,
        ncbAccountNumber: data.ncb_account_number,
        stkPushStatus: data.stk_push_status,
        ncbReferenceId: data.ncb_reference_id,
        status: data.status,
        smsSent: data.sms_sent,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Create Wallet Transaction Exception:', error);
      return null;
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(walletId: string, limit: number = 50, offset: number = 0): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Get Wallet Transactions Error:', error);
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        walletId: item.wallet_id,
        transactionType: item.transaction_type,
        amount: parseFloat(item.amount),
        reference: item.reference,
        description: item.description,
        floatAmount: item.float_amount ? parseFloat(item.float_amount) : undefined,
        transferFee: item.transfer_fee ? parseFloat(item.transfer_fee) : undefined,
        processingFee: item.processing_fee ? parseFloat(item.processing_fee) : undefined,
        ncbTransferReference: item.ncb_transfer_reference,
        ncbFloatReference: item.ncb_float_reference,
        otpReference: item.otp_reference,
        otpValidated: item.otp_validated,
        otpValidatedAt: item.otp_validated_at,
        authorizedUserId: item.authorized_user_id,
        stkPushTransactionId: item.stk_push_transaction_id,
        ncbPaybillNumber: item.ncb_paybill_number,
        ncbAccountNumber: item.ncb_account_number,
        stkPushStatus: item.stk_push_status,
        ncbReferenceId: item.ncb_reference_id,
        status: item.status,
        smsSent: item.sms_sent,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Get Wallet Transactions Exception:', error);
      return [];
    }
  }

  /**
   * Get B2C float balance
   */
  async getB2CFloatBalance(partnerId: string): Promise<B2CFloatBalance | null> {
    try {
      const { data, error } = await this.supabase
        .from('b2c_float_balance')
        .select('*')
        .eq('partner_id', partnerId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        partnerId: data.partner_id,
        currentFloatBalance: parseFloat(data.current_float_balance),
        lastPurchaseDate: data.last_purchase_date,
        lastPurchaseAmount: data.last_purchase_amount ? parseFloat(data.last_purchase_amount) : undefined,
        totalPurchased: parseFloat(data.total_purchased),
        totalUsed: parseFloat(data.total_used),
        ncbAccountReference: data.ncb_account_reference,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Get B2C Float Balance Error:', error);
      return null;
    }
  }

  /**
   * Update B2C float balance
   */
  async updateB2CFloatBalance(partnerId: string, newBalance: number, purchaseAmount?: number): Promise<boolean> {
    try {
      const updateData: any = {
        current_float_balance: newBalance,
        updated_at: new Date().toISOString()
      };

      if (purchaseAmount) {
        updateData.last_purchase_date = new Date().toISOString();
        updateData.last_purchase_amount = purchaseAmount;
        // Note: total_purchased increment will be handled in a separate query
      }

      const { error } = await this.supabase
        .from('b2c_float_balance')
        .update(updateData)
        .eq('partner_id', partnerId);

      if (error) {
        console.error('Update B2C Float Balance Error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update B2C Float Balance Exception:', error);
      return false;
    }
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasSufficientBalance(partnerId: string, requiredAmount: number): Promise<boolean> {
    const wallet = await this.getPartnerWallet(partnerId);
    return wallet ? wallet.currentBalance >= requiredAmount : false;
  }

  /**
   * Check if wallet is below low balance threshold
   */
  async isLowBalance(partnerId: string): Promise<boolean> {
    const wallet = await this.getPartnerWallet(partnerId);
    return wallet ? wallet.currentBalance < wallet.lowBalanceThreshold : false;
  }

  /**
   * Generate transaction reference
   */
  generateTransactionReference(transactionType: string, partnerId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const partnerShort = partnerId.substring(0, 8);
    return `${transactionType.toUpperCase()}_${partnerShort}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Validate amount
   */
  static validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 1000000; // 1M KES limit
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number, currency: string = 'KES'): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }
}

// Export types for use in other modules
export type {
  Wallet,
  WalletTransaction,
  B2CFloatBalance,
  WalletTopupRequest,
  WalletTopupResponse,
  B2CFloatPurchaseRequest,
  B2CFloatPurchaseResponse
};
