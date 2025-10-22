// Mifos X API Client
// This module handles all interactions with Mifos X systems
// Date: December 2024
// Version: 1.0

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface MifosConfig {
  hostUrl: string
  username: string
  password: string
  tenantId: string
  apiEndpoint?: string
}

export interface MifosAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface MifosLoanProduct {
  id: number
  name: string
  shortName: string
  description: string
  currency: {
    code: string
    name: string
  }
  principal: number
  numberOfRepayments: number
  repaymentEvery: number
  repaymentFrequencyType: {
    id: number
    code: string
    value: string
  }
  interestRatePerPeriod: number
  interestRateFrequencyType: {
    id: number
    code: string
    value: string
  }
  amortizationType: {
    id: number
    code: string
    value: string
  }
  interestType: {
    id: number
    code: string
    value: string
  }
  interestCalculationPeriodType: {
    id: number
    code: string
    value: string
  }
  status: {
    id: number
    code: string
    value: string
  }
  charges: Array<{
    id: number
    name: string
    amount: number
    currency: {
      code: string
      name: string
    }
  }>
}

export interface MifosClient {
  id: number
  accountNo: string
  status: {
    id: number
    code: string
    value: string
  }
  active: boolean
  activationDate: string[]
  firstname: string
  middlename?: string
  lastname: string
  fullname: string
  displayName: string
  officeId: number
  officeName: string
  staffId?: number
  staffName?: string
  timeline: {
    submittedOnDate: string[]
    submittedByUsername: string
    submittedByFirstname: string
    submittedByLastname: string
    activatedOnDate: string[]
    activatedByUsername: string
    activatedByFirstname: string
    activatedByLastname: string
  }
  savingsProductId?: number
  savingsProductName?: string
  groups?: Array<{
    id: number
    name: string
    accountNo: string
  }>
}

export interface MifosLoan {
  id: number
  accountNo: string
  status: {
    id: number
    code: string
    value: string
  }
  clientId: number
  clientName: string
  clientAccountNo: string
  loanProductId: number
  loanProductName: string
  loanProductDescription: string
  principal: number
  approvedPrincipal: number
  proposedPrincipal: number
  currency: {
    code: string
    name: string
    decimalPlaces: number
    displaySymbol: string
    nameCode: string
    displayLabel: string
  }
  termFrequency: number
  termPeriodFrequencyType: {
    id: number
    code: string
    value: string
  }
  numberOfRepayments: number
  repaymentEvery: number
  repaymentFrequencyType: {
    id: number
    code: string
    value: string
  }
  interestRatePerPeriod: number
  interestRateFrequencyType: {
    id: number
    code: string
    value: string
  }
  annualInterestRate: number
  isFloatingInterestRate: boolean
  allowPartialPeriodInterestCalculation: boolean
  transactionProcessingStrategyId: number
  transactionProcessingStrategyName: string
  timeline: {
    submittedOnDate: string[]
    submittedByUsername: string
    submittedByFirstname: string
    submittedByLastname: string
    approvedOnDate: string[]
    approvedByUsername: string
    approvedByFirstname: string
    approvedByLastname: string
    expectedDisbursementDate: string[]
    actualDisbursementDate?: string[]
    disbursedByUsername?: string
    disbursedByFirstname?: string
    disbursedByLastname?: string
  }
  summary: {
    principalDisbursed: number
    principalPaid: number
    principalWrittenOff: number
    principalOutstanding: number
    principalOverdue: number
    interestCharged: number
    interestPaid: number
    interestWaived: number
    interestWrittenOff: number
    interestOutstanding: number
    interestOverdue: number
    feeChargesCharged: number
    feeChargesDueAtDisbursementCharged: number
    feeChargesPaid: number
    feeChargesWaived: number
    feeChargesWrittenOff: number
    feeChargesOutstanding: number
    feeChargesOverdue: number
    penaltyChargesCharged: number
    penaltyChargesPaid: number
    penaltyChargesWaived: number
    penaltyChargesWrittenOff: number
    penaltyChargesOutstanding: number
    penaltyChargesOverdue: number
    totalExpectedRepayment: number
    totalRepayment: number
    totalExpectedCostOfLoan: number
    totalCostOfLoan: number
    totalWaived: number
    totalWrittenOff: number
    totalOutstanding: number
    totalOverdue: number
  }
}

export interface MifosLoanApprovalRequest {
  approvedOnDate: string
  dateFormat: string
  locale: string
  note?: string
}

export interface MifosDisbursementRequest {
  actualDisbursementDate: string
  dateFormat: string
  locale: string
  note?: string
}

export class MifosClient {
  private supabaseClient: any
  private config: MifosConfig
  private authToken: string | null = null
  private tokenExpiry: number = 0

  constructor(supabaseClient: any, config: MifosConfig) {
    this.supabaseClient = supabaseClient
    this.config = config
  }

  /**
   * Authenticate with Mifos X API
   */
  private async authenticate(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.authToken && Date.now() < this.tokenExpiry) {
        return this.authToken
      }

      const authUrl = `${this.config.hostUrl}/fineract-provider/api/v1/authentication`
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Fineract-Platform-TenantId': this.config.tenantId
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password
        })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Mifos X authentication failed: ${response.status} - ${errorBody}`)
      }

      const authData: MifosAuthResponse = await response.json()
      
      this.authToken = authData.access_token
      this.tokenExpiry = Date.now() + (authData.expires_in * 1000) - 60000 // 1 minute buffer
      
      return this.authToken
    } catch (error) {
      console.error('Mifos X Authentication Error:', error)
      throw new Error(`Failed to authenticate with Mifos X: ${error.message}`)
    }
  }

  /**
   * Make authenticated request to Mifos X API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.authenticate()
    const url = `${this.config.hostUrl}/fineract-provider/api/v1${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': this.config.tenantId,
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Mifos X API request failed: ${response.status} - ${errorBody}`)
    }

    return await response.json()
  }

  /**
   * Get all loan products
   */
  async getLoanProducts(): Promise<MifosLoanProduct[]> {
    try {
      const response = await this.makeRequest('/loanproducts')
      return response || []
    } catch (error) {
      console.error('Error fetching loan products:', error)
      throw new Error(`Failed to fetch loan products: ${error.message}`)
    }
  }

  /**
   * Get loan product by ID
   */
  async getLoanProduct(productId: number): Promise<MifosLoanProduct> {
    try {
      const response = await this.makeRequest(`/loanproducts/${productId}`)
      return response
    } catch (error) {
      console.error('Error fetching loan product:', error)
      throw new Error(`Failed to fetch loan product: ${error.message}`)
    }
  }

  /**
   * Get all clients
   */
  async getClients(): Promise<MifosClient[]> {
    try {
      const response = await this.makeRequest('/clients')
      return response || []
    } catch (error) {
      console.error('Error fetching clients:', error)
      throw new Error(`Failed to fetch clients: ${error.message}`)
    }
  }

  /**
   * Get client by ID
   */
  async getClient(clientId: number): Promise<MifosClient> {
    try {
      const response = await this.makeRequest(`/clients/${clientId}`)
      return response
    } catch (error) {
      console.error('Error fetching client:', error)
      throw new Error(`Failed to fetch client: ${error.message}`)
    }
  }

  /**
   * Get all loans
   */
  async getLoans(): Promise<MifosLoan[]> {
    try {
      const response = await this.makeRequest('/loans')
      return response || []
    } catch (error) {
      console.error('Error fetching loans:', error)
      throw new Error(`Failed to fetch loans: ${error.message}`)
    }
  }

  /**
   * Get loans by status
   */
  async getLoansByStatus(status: string): Promise<MifosLoan[]> {
    try {
      const response = await this.makeRequest(`/loans?status=${status}`)
      return response || []
    } catch (error) {
      console.error('Error fetching loans by status:', error)
      throw new Error(`Failed to fetch loans by status: ${error.message}`)
    }
  }

  /**
   * Get approved loans (ready for disbursement)
   */
  async getApprovedLoans(): Promise<MifosLoan[]> {
    try {
      const response = await this.makeRequest('/loans?status=approved')
      return response || []
    } catch (error) {
      console.error('Error fetching approved loans:', error)
      throw new Error(`Failed to fetch approved loans: ${error.message}`)
    }
  }

  /**
   * Get loan by ID
   */
  async getLoan(loanId: number): Promise<MifosLoan> {
    try {
      const response = await this.makeRequest(`/loans/${loanId}`)
      return response
    } catch (error) {
      console.error('Error fetching loan:', error)
      throw new Error(`Failed to fetch loan: ${error.message}`)
    }
  }

  /**
   * Approve a loan
   */
  async approveLoan(loanId: number, approvalData: MifosLoanApprovalRequest): Promise<any> {
    try {
      const response = await this.makeRequest(`/loans/${loanId}?command=approve`, {
        method: 'POST',
        body: JSON.stringify(approvalData)
      })
      return response
    } catch (error) {
      console.error('Error approving loan:', error)
      throw new Error(`Failed to approve loan: ${error.message}`)
    }
  }

  /**
   * Disburse a loan
   */
  async disburseLoan(loanId: number, disbursementData: MifosDisbursementRequest): Promise<any> {
    try {
      const response = await this.makeRequest(`/loans/${loanId}?command=disburse`, {
        method: 'POST',
        body: JSON.stringify(disbursementData)
      })
      return response
    } catch (error) {
      console.error('Error disbursing loan:', error)
      throw new Error(`Failed to disburse loan: ${error.message}`)
    }
  }

  /**
   * Update loan status after disbursement
   */
  async updateLoanStatus(loanId: number, status: string, note?: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/loans/${loanId}?command=${status}`, {
        method: 'POST',
        body: JSON.stringify({
          note: note || `Loan ${status} via Payment Vault system`,
          dateFormat: 'dd MMMM yyyy',
          locale: 'en'
        })
      })
      return response
    } catch (error) {
      console.error('Error updating loan status:', error)
      throw new Error(`Failed to update loan status: ${error.message}`)
    }
  }

  /**
   * Get loan transactions
   */
  async getLoanTransactions(loanId: number): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/loans/${loanId}/transactions`)
      return response || []
    } catch (error) {
      console.error('Error fetching loan transactions:', error)
      throw new Error(`Failed to fetch loan transactions: ${error.message}`)
    }
  }

  /**
   * Test connection to Mifos X
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch (error) {
      console.error('Mifos X connection test failed:', error)
      return false
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    try {
      const response = await this.makeRequest('/system')
      return response
    } catch (error) {
      console.error('Error fetching system info:', error)
      throw new Error(`Failed to fetch system info: ${error.message}`)
    }
  }
}

// Export types for use in other modules
export type {
  MifosConfig,
  MifosAuthResponse,
  MifosLoanProduct,
  MifosClient,
  MifosLoan,
  MifosLoanApprovalRequest,
  MifosDisbursementRequest
}

