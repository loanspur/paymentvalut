// NCBA STK Push API Client
// This module handles all NCBA STK Push API interactions for wallet top-ups and B2C float purchases
// Date: December 2024
// Version: 1.0

export interface NCBAConfig {
  baseUrl: string;
  username: string;
  password: string;
  paybillNumber: string;
  accountNumber: string;
}

export interface STKPushRequest {
  telephoneNo: string;
  amount: string;
  paybillNo: string;
  accountNo: string;
  network: string;
  transactionType: string;
}

export interface STKPushResponse {
  success: boolean;
  transactionId?: string;
  referenceId?: string;
  message?: string;
  error?: string;
  response?: any;
}

export interface STKPushQueryRequest {
  transactionId: string;
}

export interface STKPushQueryResponse {
  success: boolean;
  status?: string;
  amount?: number;
  phoneNumber?: string;
  transactionId?: string;
  referenceId?: string;
  message?: string;
  error?: string;
  response?: any;
}

export class NCBAClient {
  private config: NCBAConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: NCBAConfig) {
    this.config = config;
  }

  /**
   * Get access token from NCBA API
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const authString = btoa(`${this.config.username}:${this.config.password}`);
      const response = await fetch(`${this.config.baseUrl}/payments/api/v1/auth/token`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`
        }
      });

      if (!response.ok) {
        throw new Error(`NCBA Auth failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        // Set token expiry to 50 minutes (tokens typically last 1 hour)
        this.tokenExpiry = Date.now() + (50 * 60 * 1000);
        return this.accessToken;
      } else {
        throw new Error('No access token received from NCBA');
      }
    } catch (error) {
      console.error('NCBA Auth Error:', error);
      throw new Error(`Failed to get NCBA access token: ${error.message}`);
    }
  }

  /**
   * Initiate STK Push for wallet top-up
   */
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const token = await this.getAccessToken();
      
      const payload = {
        TelephoneNo: request.telephoneNo,
        Amount: request.amount,
        PayBillNo: request.paybillNo,
        AccountNo: request.accountNo,
        Network: request.network,
        TransactionType: request.transactionType
      };

      console.log('NCBA STK Push Request:', {
        ...payload,
        TelephoneNo: payload.TelephoneNo.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1***$4') // Mask phone number
      });

      const response = await fetch(`${this.config.baseUrl}/payments/api/v1/stk-push/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      
      console.log('NCBA STK Push Response:', responseData);

      if (response.ok && responseData.success) {
        return {
          success: true,
          transactionId: responseData.transactionId || responseData.TransactionID,
          referenceId: responseData.referenceId || responseData.ReferenceID,
          message: responseData.message || 'STK Push initiated successfully',
          response: responseData
        };
      } else {
        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP ${response.status}`,
          response: responseData
        };
      }
    } catch (error) {
      console.error('NCBA STK Push Error:', error);
      return {
        success: false,
        error: `STK Push failed: ${error.message}`,
        response: null
      };
    }
  }

  /**
   * Query STK Push status
   */
  async querySTKPushStatus(request: STKPushQueryRequest): Promise<STKPushQueryResponse> {
    try {
      const token = await this.getAccessToken();
      
      const payload = {
        TransactionID: request.transactionId
      };

      console.log('NCBA STK Push Query Request:', payload);

      const response = await fetch(`${this.config.baseUrl}/payments/api/v1/stk-push/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      
      console.log('NCBA STK Push Query Response:', responseData);

      if (response.ok) {
        return {
          success: true,
          status: responseData.status || responseData.Status,
          amount: responseData.amount || responseData.Amount,
          phoneNumber: responseData.phoneNumber || responseData.PhoneNumber,
          transactionId: responseData.transactionId || responseData.TransactionID,
          referenceId: responseData.referenceId || responseData.ReferenceID,
          message: responseData.message || responseData.Message,
          response: responseData
        };
      } else {
        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP ${response.status}`,
          response: responseData
        };
      }
    } catch (error) {
      console.error('NCBA STK Push Query Error:', error);
      return {
        success: false,
        error: `STK Push query failed: ${error.message}`,
        response: null
      };
    }
  }

  /**
   * Create wallet top-up STK Push request
   */
  createWalletTopupRequest(phoneNumber: string, amount: number): STKPushRequest {
    return {
      telephoneNo: phoneNumber,
      amount: amount.toString(),
      paybillNo: this.config.paybillNumber,
      accountNo: this.config.accountNumber,
      network: 'Safaricom',
      transactionType: 'CustomerPayBillOnline'
    };
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Kenyan phone number
    // Should be 12 digits starting with 254
    return /^254[0-9]{9}$/.test(cleaned);
  }

  /**
   * Format phone number to NCBA format
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    }
    
    // If it starts with 254, return as is
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // If it's 9 digits, add 254 prefix
    if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate amount
   */
  static validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 150000; // NCBA STK Push limit
  }

  /**
   * Get error message for common NCBA errors
   */
  static getErrorMessage(error: string): string {
    const errorMessages: { [key: string]: string } = {
      'DS_TIMEOUT': 'Request timeout. Please try again.',
      'DS_USER_CANCELLED': 'Transaction cancelled by user.',
      'DS_INSUFFICIENT_FUNDS': 'Insufficient M-Pesa balance.',
      'DS_INVALID_ACCOUNT': 'Invalid account number.',
      'DS_INVALID_AMOUNT': 'Invalid amount specified.',
      'DS_INVALID_PHONE': 'Invalid phone number.',
      'DS_SYSTEM_ERROR': 'System error. Please try again later.',
      'DS_NETWORK_ERROR': 'Network error. Please check your connection.'
    };

    return errorMessages[error] || `Transaction failed: ${error}`;
  }
}

// Default NCBA configuration
export const DEFAULT_NCBA_CONFIG: NCBAConfig = {
  baseUrl: 'https://c2bapis.ncbagroup.com',
  username: process.env.NCBA_USERNAME || '',
  password: process.env.NCBA_PASSWORD || '',
  paybillNumber: '880100',
  accountNumber: process.env.NCBA_ACCOUNT_NUMBER || ''
};

// Helper function to create NCBA client
export function createNCBAClient(config?: Partial<NCBAConfig>): NCBAClient {
  const finalConfig = { ...DEFAULT_NCBA_CONFIG, ...config };
  return new NCBAClient(finalConfig);
}

// Export types for use in other modules
export type {
  NCBAConfig,
  STKPushRequest,
  STKPushResponse,
  STKPushQueryRequest,
  STKPushQueryResponse
};

