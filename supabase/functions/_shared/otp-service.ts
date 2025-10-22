// OTP Validation Service
// This module handles OTP generation, validation, and management for financial transactions
// Date: December 2024
// Version: 1.0

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface OTPRequest {
  partnerId: string;
  userId?: string;
  phoneNumber: string;
  emailAddress: string;
  purpose: 'float_purchase' | 'disbursement' | 'wallet_topup';
  amount?: number;
}

export interface OTPValidation {
  id: string;
  reference: string;
  partnerId: string;
  userId?: string;
  phoneNumber: string;
  emailAddress: string;
  otpCode: string;
  purpose: string;
  amount?: number;
  status: 'pending' | 'validated' | 'expired' | 'failed';
  attempts: number;
  maxAttempts: number;
  smsSent: boolean;
  emailSent: boolean;
  expiresAt: string;
  validatedAt?: string;
  createdAt: string;
}

export interface OTPValidationRequest {
  reference: string;
  otpCode: string;
  partnerId: string;
}

export interface OTPValidationResponse {
  success: boolean;
  valid: boolean;
  message: string;
  remainingAttempts?: number;
  otp?: OTPValidation;
}

export class OTPService {
  private supabase: any;
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Generate a random OTP code
   */
  private generateOTPCode(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Generate a unique reference for OTP
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `OTP_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Create OTP validation record
   */
  async createOTP(request: OTPRequest): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const reference = this.generateReference();
      const otpCode = this.generateOTPCode();
      const expiresAt = new Date(Date.now() + (this.OTP_EXPIRY_MINUTES * 60 * 1000));

      const { data, error } = await this.supabase
        .from('otp_validations')
        .insert({
          reference,
          partner_id: request.partnerId,
          user_id: request.userId,
          phone_number: request.phoneNumber,
          email_address: request.emailAddress,
          otp_code: otpCode,
          purpose: request.purpose,
          amount: request.amount,
          status: 'pending',
          attempts: 0,
          max_attempts: this.MAX_ATTEMPTS,
          sms_sent: false,
          email_sent: false,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('OTP Creation Error:', error);
        return { success: false, error: error.message };
      }

      console.log('OTP Created:', {
        reference,
        purpose: request.purpose,
        amount: request.amount,
        expiresAt: expiresAt.toISOString()
      });

      return { success: true, reference };
    } catch (error) {
      console.error('OTP Creation Exception:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate OTP code
   */
  async validateOTP(request: OTPValidationRequest): Promise<OTPValidationResponse> {
    try {
      // Get OTP record
      const { data: otpData, error: fetchError } = await this.supabase
        .from('otp_validations')
        .select('*')
        .eq('reference', request.reference)
        .eq('partner_id', request.partnerId)
        .single();

      if (fetchError || !otpData) {
        return {
          success: false,
          valid: false,
          message: 'Invalid OTP reference'
        };
      }

      const otp = otpData as OTPValidation;

      // Check if OTP is expired
      if (new Date(otp.expiresAt) < new Date()) {
        await this.updateOTPStatus(otp.id, 'expired');
        return {
          success: true,
          valid: false,
          message: 'OTP has expired. Please request a new one.'
        };
      }

      // Check if OTP is already validated
      if (otp.status === 'validated') {
        return {
          success: true,
          valid: true,
          message: 'OTP already validated',
          otp
        };
      }

      // Check if OTP is failed
      if (otp.status === 'failed') {
        return {
          success: true,
          valid: false,
          message: 'OTP validation failed. Please request a new one.'
        };
      }

      // Check remaining attempts
      const remainingAttempts = otp.maxAttempts - otp.attempts;
      if (remainingAttempts <= 0) {
        await this.updateOTPStatus(otp.id, 'failed');
        return {
          success: true,
          valid: false,
          message: 'Maximum attempts exceeded. Please request a new OTP.'
        };
      }

      // Validate OTP code
      if (otp.otpCode === request.otpCode) {
        // OTP is valid
        await this.updateOTPStatus(otp.id, 'validated');
        
        const updatedOtp = { ...otp, status: 'validated' as const, validatedAt: new Date().toISOString() };
        
        return {
          success: true,
          valid: true,
          message: 'OTP validated successfully',
          otp: updatedOtp
        };
      } else {
        // OTP is invalid, increment attempts
        await this.incrementOTPAttempts(otp.id);
        
        return {
          success: true,
          valid: false,
          message: `Invalid OTP. ${Math.max(0, remainingAttempts - 1)} attempts remaining.`,
          remainingAttempts: Math.max(0, remainingAttempts - 1)
        };
      }
    } catch (error) {
      console.error('OTP Validation Error:', error);
      return {
        success: false,
        valid: false,
        message: `Validation failed: ${error.message}`
      };
    }
  }

  /**
   * Update OTP status
   */
  private async updateOTPStatus(otpId: string, status: string): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'validated') {
      updateData.validated_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('otp_validations')
      .update(updateData)
      .eq('id', otpId);

    if (error) {
      console.error('OTP Status Update Error:', error);
    }
  }

  /**
   * Increment OTP attempts
   */
  private async incrementOTPAttempts(otpId: string): Promise<void> {
    // First get current attempts
    const { data: currentOtp, error: fetchError } = await this.supabase
      .from('otp_validations')
      .select('attempts')
      .eq('id', otpId)
      .single();

    if (fetchError || !currentOtp) {
      console.error('OTP Fetch Error:', fetchError);
      return;
    }

    // Update with incremented attempts
    const { error } = await this.supabase
      .from('otp_validations')
      .update({ 
        attempts: currentOtp.attempts + 1
      })
      .eq('id', otpId);

    if (error) {
      console.error('OTP Attempts Update Error:', error);
    }
  }

  /**
   * Get OTP by reference
   */
  async getOTPByReference(reference: string, partnerId: string): Promise<OTPValidation | null> {
    try {
      const { data, error } = await this.supabase
        .from('otp_validations')
        .select('*')
        .eq('reference', reference)
        .eq('partner_id', partnerId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as OTPValidation;
    } catch (error) {
      console.error('Get OTP Error:', error);
      return null;
    }
  }

  /**
   * Clean up expired OTPs
   */
  async cleanupExpiredOTPs(): Promise<{ cleaned: number; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('otp_validations')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'pending')
        .select();

      if (error) {
        console.error('OTP Cleanup Error:', error);
        return { cleaned: 0, error: error.message };
      }

      return { cleaned: data?.length || 0 };
    } catch (error) {
      console.error('OTP Cleanup Exception:', error);
      return { cleaned: 0, error: error.message };
    }
  }

  /**
   * Generate OTP message for SMS
   */
  generateOTPMessage(otpCode: string, purpose: string, amount?: number): string {
    const purposeText = {
      'float_purchase': 'B2C float purchase',
      'disbursement': 'disbursement',
      'wallet_topup': 'wallet top-up'
    }[purpose] || purpose;

    const amountText = amount ? ` for KES ${amount.toLocaleString()}` : '';
    
    return `Your OTP for ${purposeText}${amountText} is: ${otpCode}. Valid for 10 minutes. Do not share this code.`;
  }

  /**
   * Generate OTP email subject
   */
  generateOTPEmailSubject(purpose: string): string {
    const purposeText = {
      'float_purchase': 'B2C Float Purchase',
      'disbursement': 'Disbursement',
      'wallet_topup': 'Wallet Top-up'
    }[purpose] || purpose;

    return `OTP for ${purposeText} - Payment Vault`;
  }

  /**
   * Generate OTP email body
   */
  generateOTPEmailBody(otpCode: string, purpose: string, amount?: number): string {
    const purposeText = {
      'float_purchase': 'B2C float purchase',
      'disbursement': 'disbursement',
      'wallet_topup': 'wallet top-up'
    }[purpose] || purpose;

    const amountText = amount ? ` for KES ${amount.toLocaleString()}` : '';

    return `
      <h2>OTP Verification</h2>
      <p>Your OTP for ${purposeText}${amountText} is:</p>
      <h1 style="color: #007bff; font-size: 32px; letter-spacing: 4px;">${otpCode}</h1>
      <p>This OTP is valid for 10 minutes.</p>
      <p><strong>Important:</strong> Do not share this code with anyone. Payment Vault will never ask for your OTP.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">This is an automated message from Payment Vault System.</p>
    `;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return /^254[0-9]{9}$/.test(cleaned);
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format phone number
   */
  static formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    }
    
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }
}

// Export types for use in other modules
export type {
  OTPRequest,
  OTPValidation,
  OTPValidationRequest,
  OTPValidationResponse
};
