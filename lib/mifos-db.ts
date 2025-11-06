/**
 * Mifos Database Helper Functions
 * Query Mifos X data directly from Supabase instead of API calls
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface MifosClient {
  id: number
  account_no: string
  external_id?: string
  status_enum: number
  activation_date?: string
  office_id: number
  staff_id?: number
  firstname: string
  middlename?: string
  lastname: string
  display_name?: string
  mobile_no?: string
  email_address?: string
  date_of_birth?: string
  is_active: boolean
}

export interface MifosLoan {
  id: number
  account_no: string
  external_id?: string
  client_id: number
  loan_product_id: number
  loan_status_id: number
  principal_amount: number
  approved_principal_amount?: number
  total_outstanding_derived: number
  total_repaid_derived: number
  disbursedon_date?: string
  expected_disbursedon_date?: string
  closedon_date?: string
}

export interface MifosOffice {
  id: number
  name: string
  external_id?: string
  opening_date: string
  is_active: boolean
}

export interface MifosStaff {
  id: number
  firstname: string
  lastname: string
  display_name?: string
  office_id: number
  is_loan_officer: boolean
  is_active: boolean
}

/**
 * Get Mifos clients with filters
 */
export async function getMifosClients(filters?: {
  officeId?: number
  staffId?: number
  status?: string | number
  searchTerm?: string
  limit?: number
  offset?: number
}): Promise<MifosClient[]> {
  try {
    let query = supabase.from('mifos.m_client').select('*')

    if (filters?.officeId) {
      query = query.eq('office_id', filters.officeId)
    }

    if (filters?.staffId) {
      query = query.eq('staff_id', filters.staffId)
    }

    if (filters?.status !== undefined) {
      const statusValue = typeof filters.status === 'string' 
        ? parseInt(filters.status) 
        : filters.status
      query = query.eq('status_enum', statusValue)
    }

    if (filters?.searchTerm) {
      query = query.or(
        `firstname.ilike.%${filters.searchTerm}%,` +
        `lastname.ilike.%${filters.searchTerm}%,` +
        `display_name.ilike.%${filters.searchTerm}%,` +
        `account_no.ilike.%${filters.searchTerm}%,` +
        `mobile_no.ilike.%${filters.searchTerm}%`
      )
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching Mifos clients:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getMifosClients:', error)
    throw error
  }
}

/**
 * Get a single Mifos client by ID
 */
export async function getMifosClientById(clientId: number): Promise<MifosClient | null> {
  try {
    const { data, error } = await supabase
      .from('mifos.m_client')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      console.error('Error fetching Mifos client:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in getMifosClientById:', error)
    throw error
  }
}

/**
 * Get Mifos loans with filters
 */
export async function getMifosLoans(filters?: {
  clientId?: number
  status?: string | number
  loanProductId?: number
  limit?: number
  offset?: number
}): Promise<MifosLoan[]> {
  try {
    let query = supabase.from('mifos.m_loan').select('*')

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId)
    }

    if (filters?.status !== undefined) {
      const statusValue = typeof filters.status === 'string' 
        ? parseInt(filters.status) 
        : filters.status
      query = query.eq('loan_status_id', statusValue)
    }

    if (filters?.loanProductId) {
      query = query.eq('loan_product_id', filters.loanProductId)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching Mifos loans:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getMifosLoans:', error)
    throw error
  }
}

/**
 * Get a single Mifos loan by ID
 */
export async function getMifosLoanById(loanId: number): Promise<MifosLoan | null> {
  try {
    const { data, error } = await supabase
      .from('mifos.m_loan')
      .select('*')
      .eq('id', loanId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching Mifos loan:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in getMifosLoanById:', error)
    throw error
  }
}

/**
 * Get Mifos offices
 */
export async function getMifosOffices(): Promise<MifosOffice[]> {
  try {
    const { data, error } = await supabase
      .from('mifos.m_office')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching Mifos offices:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getMifosOffices:', error)
    throw error
  }
}

/**
 * Get Mifos staff/loan officers
 */
export async function getMifosStaff(filters?: {
  officeId?: number
  loanOfficersOnly?: boolean
  isActive?: boolean
}): Promise<MifosStaff[]> {
  try {
    let query = supabase.from('mifos.m_staff').select('*')

    if (filters?.officeId) {
      query = query.eq('office_id', filters.officeId)
    }

    if (filters?.loanOfficersOnly) {
      query = query.eq('is_loan_officer', true)
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    } else {
      query = query.eq('is_active', true)
    }

    query = query.order('display_name')

    const { data, error } = await query

    if (error) {
      console.error('Error fetching Mifos staff:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getMifosStaff:', error)
    throw error
  }
}

/**
 * Get client loans with details (joins)
 */
export async function getClientLoansWithDetails(clientId: number): Promise<any[]> {
  try {
    // This would require a more complex query or RPC function
    // For now, fetch loans and client separately
    const [client, loans] = await Promise.all([
      getMifosClientById(clientId),
      getMifosLoans({ clientId }),
    ])

    return loans.map((loan) => ({
      ...loan,
      client,
    }))
  } catch (error) {
    console.error('Error in getClientLoansWithDetails:', error)
    throw error
  }
}

/**
 * Search clients by various criteria
 */
export async function searchMifosClients(criteria: {
  query?: string
  officeId?: number
  staffId?: number
  hasActiveLoans?: boolean
  minLoanAmount?: number
  maxLoanAmount?: number
}): Promise<MifosClient[]> {
  try {
    let query = supabase.from('mifos.m_client').select('*')

    if (criteria.query) {
      query = query.or(
        `firstname.ilike.%${criteria.query}%,` +
        `lastname.ilike.%${criteria.query}%,` +
        `display_name.ilike.%${criteria.query}%,` +
        `account_no.ilike.%${criteria.query}%,` +
        `mobile_no.ilike.%${criteria.query}%,` +
        `email_address.ilike.%${criteria.query}%`
      )
    }

    if (criteria.officeId) {
      query = query.eq('office_id', criteria.officeId)
    }

    if (criteria.staffId) {
      query = query.eq('staff_id', criteria.staffId)
    }

    // Note: For complex queries like hasActiveLoans or loan amounts,
    // you might need to create a database view or RPC function

    const { data, error } = await query.limit(100)

    if (error) {
      console.error('Error searching Mifos clients:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in searchMifosClients:', error)
    throw error
  }
}

/**
 * Get loan statistics for a client
 */
export async function getClientLoanStats(clientId: number): Promise<{
  totalLoans: number
  activeLoans: number
  totalOutstanding: number
  totalRepaid: number
}> {
  try {
    const loans = await getMifosLoans({ clientId })

    const activeLoans = loans.filter(
      (loan) => loan.loan_status_id === 300 // Active status
    )

    const totalOutstanding = loans.reduce(
      (sum, loan) => sum + (loan.total_outstanding_derived || 0),
      0
    )

    const totalRepaid = loans.reduce(
      (sum, loan) => sum + (loan.total_repaid_derived || 0),
      0
    )

    return {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      totalOutstanding,
      totalRepaid,
    }
  } catch (error) {
    console.error('Error in getClientLoanStats:', error)
    throw error
  }
}

