// Centralized data management for the M-Pesa B2C system
// This replaces all hardcoded mock data with a dynamic system

export interface Partner {
  id: string
  name: string
  short_code: string
  mpesa_shortcode: string
  mpesa_consumer_key: string
  mpesa_consumer_secret: string
  mpesa_passkey: string
  mpesa_initiator_name: string
  mpesa_initiator_password: string
  mpesa_environment: string
  is_active: boolean
  is_mpesa_configured: boolean
  api_key?: string
  created_at: string
  updated_at: string
}

export interface DisbursementRequest {
  id: string
  origin: 'ui' | 'ussd'
  tenant_id: string
  partner_id: string
  partner_shortcode_id: string
  mpesa_shortcode: string
  amount: number
  msisdn: string
  customer_id: string
  client_request_id: string
  disbursement_id?: string
  conversation_id?: string
  transaction_receipt?: string
  status: 'queued' | 'accepted' | 'success' | 'failed' | 'timeout'
  mpesa_working_account_balance?: number
  mpesa_utility_account_balance?: number
  mpesa_charges_account_balance?: number
  balance_updated_at?: string
  created_at: string
  updated_at: string
}

// In-memory data store (in production, this would be replaced with database calls)
class DataStore {
  private partners: Partner[] = []
  private disbursements: DisbursementRequest[] = []
  private nextPartnerId = 1
  private nextDisbursementId = 1

  constructor() {
    this.initializeDefaultData()
  }

  private initializeDefaultData() {
    // Initialize with empty arrays - data will be loaded from database
    this.partners = []
    this.disbursements = []
    
    // Add Kulman Group Limited for production use
    this.partners.push({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Kulman Group Limited',
      short_code: 'KULMNA',
      mpesa_shortcode: '174379',
      mpesa_consumer_key: '',
      mpesa_consumer_secret: '',
      mpesa_passkey: '',
      mpesa_initiator_name: '',
      mpesa_initiator_password: '',
      mpesa_environment: 'production',
      is_active: true,
      is_mpesa_configured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    
    // Add a test partner for development/testing
    this.partners.push({
      id: 'test-partner-001',
      name: 'Test Partner Limited',
      short_code: 'TEST',
      mpesa_shortcode: '174379',
      mpesa_consumer_key: '',
      mpesa_consumer_secret: '',
      mpesa_passkey: '',
      mpesa_initiator_name: '',
      mpesa_initiator_password: '',
      mpesa_environment: 'sandbox',
      is_active: true,
      is_mpesa_configured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  // Partner management methods
  getPartners(): Partner[] {
    return this.partners.filter(p => p.is_active)
  }

  getPartnerById(id: string): Partner | undefined {
    return this.partners.find(p => p.id === id)
  }

  addPartner(partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>): Partner {
    const newPartner: Partner = {
      ...partner,
      id: `partner_${this.nextPartnerId++}_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    this.partners.push(newPartner)
    return newPartner
  }

  updatePartner(id: string, updates: Partial<Partner>): Partner | null {
    const index = this.partners.findIndex(p => p.id === id)
    if (index === -1) return null

    this.partners[index] = {
      ...this.partners[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    return this.partners[index]
  }

  deletePartner(id: string): boolean {
    const index = this.partners.findIndex(p => p.id === id)
    if (index === -1) return false

    this.partners.splice(index, 1)
    return true
  }

  // Disbursement management methods
  getDisbursements(limit = 50): DisbursementRequest[] {
    return this.disbursements
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  getDisbursementById(id: string): DisbursementRequest | undefined {
    return this.disbursements.find(d => d.id === id)
  }

  addDisbursement(disbursement: Omit<DisbursementRequest, 'id' | 'created_at' | 'updated_at'>): DisbursementRequest {
    const newDisbursement: DisbursementRequest = {
      ...disbursement,
      id: `disb_${this.nextDisbursementId++}_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    this.disbursements.unshift(newDisbursement) // Add to beginning for newest first
    return newDisbursement
  }

  updateDisbursement(id: string, updates: Partial<DisbursementRequest>): DisbursementRequest | null {
    const index = this.disbursements.findIndex(d => d.id === id)
    if (index === -1) return null

    this.disbursements[index] = {
      ...this.disbursements[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    return this.disbursements[index]
  }

  // Statistics methods
  getDisbursementStats() {
    const total = this.disbursements.length
    const successful = this.disbursements.filter(d => d.status === 'success').length
    const failed = this.disbursements.filter(d => d.status === 'failed').length
    const pending = this.disbursements.filter(d => ['queued', 'accepted'].includes(d.status)).length

    return { total, successful, failed, pending }
  }

  // Get real-time statistics (refreshes data)
  getRealTimeStats() {
    // This method ensures we get the latest data
    return this.getDisbursementStats()
  }

  // API key mapping (in production, this would be stored securely in database)
  getApiKeyForPartner(partnerId: string): string {
    // This method should be replaced with database lookup in production
    // For now, return empty string to force proper API key configuration
    return ''
  }
}

// Create singleton instance
export const dataStore = new DataStore()

// Export types and store
export default dataStore
