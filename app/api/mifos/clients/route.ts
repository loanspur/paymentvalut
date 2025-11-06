import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import { decryptData } from '../../../../lib/encryption-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get Basic Auth header for Mifos X API (same as loan-products endpoint)
function getBasicAuth(partner: any): string {
  let password = partner.mifos_password
  
  // Try to decrypt password if it appears encrypted (contains ':' separator used in encryption)
  if (password && password.includes(':') && password.length > 50) {
    try {
      const passphrase = process.env.JWT_SECRET || ''
      if (passphrase) {
        password = decryptData(password, passphrase)
      }
    } catch (decryptError) {
      // If decryption fails, use password as-is (might be plain text)
      console.warn('Password decryption failed, using as-is')
    }
  }
  
  // Use HTTP Basic Authentication directly (same method as loan-products)
  return Buffer.from(`${partner.mifos_username}:${password}`).toString('base64')
}

// Helper function to check if loan matches a status filter
function loanMatchesStatus(loan: any, statusFilter: string | undefined): boolean {
  if (!statusFilter || statusFilter === 'without_loans') return false
  
  const loanStatus = loan.status?.code?.value || loan.status?.value || loan.status?.code || ''
  return loanStatus.toLowerCase() === statusFilter.toLowerCase()
}

// Helper function to check if loan is active
function isActiveLoan(loan: any): boolean {
  const statusId = loan.status?.id
  const statusCode = loan.status?.code?.value || loan.status?.value || loan.status?.code
  const isActive = loan.status?.active === true
  const waitingDisbursal = loan.status?.waitingForDisbursal === true
  
  return (
    (statusId === 300 ||
    statusCode === 'active' ||
    statusCode === 'loanStatusType.active' ||
    isActive === true) && !waitingDisbursal
  )
}

// Fetch clients from Mifos X with filters (fetch loans directly from each client for accuracy)
async function fetchClientsFromMifos(partner: any, filters: any): Promise<any[]> {
  try {
    const apiEndpoint = partner.mifos_api_endpoint || '/fineract-provider/api/v1'
    const baseUrl = `${partner.mifos_host_url}${apiEndpoint}`
    
    // Generate Basic Auth once and reuse
    const basicAuth = getBasicAuth(partner)
    const headers = {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Fineract-Platform-TenantId': partner.mifos_tenant_id
    }
    
    const needsSavings = filters.withSavings !== undefined || filters.savingsLastDepositDate
    
    // Build client query parameters
    const clientParams = new URLSearchParams()
    if (filters.officeId) clientParams.append('officeId', filters.officeId)
    if (filters.loanOfficerId) clientParams.append('staffId', filters.loanOfficerId)
    clientParams.append('limit', '1000')
    
    // Fetch clients first
    const clientsUrl = `${baseUrl}/clients?${clientParams.toString()}`
    const clientsResponse = await fetch(clientsUrl, { headers })

    if (!clientsResponse.ok) {
      throw new Error(`Failed to fetch clients: ${clientsResponse.status}`)
    }

    const clientsData = await clientsResponse.json()
    let clients = clientsData.pageItems || clientsData || []
    
    // Early exit if no clients
    if (clients.length === 0) return []
    
    // Helper function to fetch latest deposit date for savings account
    const fetchLatestDepositDate = async (accountId: number): Promise<Date | null> => {
      try {
        // Fetch transactions ordered by date descending, limit to 1 for latest
        const transactionsUrl = `${baseUrl}/savingsaccounts/${accountId}/transactions?limit=1&orderBy=submittedOnDate&sortOrder=DESC`
        const transResponse = await fetch(transactionsUrl, { headers })
        if (!transResponse.ok) return null
        const transData = await transResponse.json()
        const transactions = transData.pageItems || transData || []
        const deposit = transactions.find((t: any) => t.transactionType?.deposit === true)
        if (!deposit) return null
        return new Date(deposit.date || deposit.submittedOnDate || deposit.entryDate)
      } catch (error) {
        return null
      }
    }
    
    // Process clients in batches for better performance
    const batchSize = 10
    const filteredClients = []
    
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize)
      
      // Process batch in parallel - fetch loans directly from each client
      const batchPromises = batch.map(async (client: any) => {
        let loans: any[] = []
        let savingsAccounts: any[] = []
        
        // Always fetch ALL loans for this client directly from the client endpoint
        try {
          const loansUrl = `${baseUrl}/clients/${client.id}/loans?limit=100`
          const loansResponse = await fetch(loansUrl, { headers })
          
          if (loansResponse.ok) {
            const loansData = await loansResponse.json()
            const allLoans = loansData.pageItems || loansData || []
            
            // Handle "without_loans" filter first
            if (filters.loanStatus === 'without_loans') {
              // If client has any loans at all, exclude them
              if (allLoans.length > 0) {
                return null // Filtered out: has loans but filter is for without loans
              }
              loans = [] // No loans, which is what we want - include this client
            } else if (filters.loanStatus) {
              // Filter loans to match the specified loan status
              loans = allLoans.filter((loan: any) => loanMatchesStatus(loan, filters.loanStatus))
              
              // If client has no loans matching the filter, exclude them
              if (loans.length === 0) {
                return null // Filtered out: no loans matching the specified status
              }
            } else {
              // No loan status filter specified - include all loans (not just active)
              // This ensures we show loan amounts for all clients with any loans
              loans = allLoans
              
              // If client has no loans at all, they can still be included
              // (they'll show 0 loans/amounts in the display)
            }
            
            console.log(`Client ${client.id}: Found ${allLoans.length} total loans, ${loans.length} matching filter`)
          } else {
            console.error(`Failed to fetch loans for client ${client.id}: ${loansResponse.status}`)
            // If we can't fetch loans and filter requires loans, exclude client
            if (filters.loanStatus && filters.loanStatus !== 'without_loans') {
              return null
            }
          }
        } catch (error) {
          console.error(`Error fetching loans for client ${client.id}:`, error)
          // If we can't fetch loans and filter requires loans, exclude client
          if (filters.loanStatus && filters.loanStatus !== 'without_loans') {
            return null
          }
        }
        
        // Fetch savings if needed
        if (needsSavings) {
          try {
            const savingsUrl = `${baseUrl}/clients/${client.id}/savingsaccounts?limit=100`
            const savingsResponse = await fetch(savingsUrl, { headers })
            if (savingsResponse.ok) {
              const savingsData = await savingsResponse.json()
              savingsAccounts = savingsData.pageItems || savingsData || []
            }
          } catch (error) {
            console.error(`Error fetching savings for client ${client.id}:`, error)
            savingsAccounts = []
          }
        }
        
        // Apply loan filters (only filter if explicitly requested)
        if (filters.withLoans === true && loans.length === 0) {
          return null // Filtered out: wants loans but has none
        }
        if (filters.withLoans === false && loans.length > 0) {
          return null // Filtered out: doesn't want loans but has them
        }
        
        // Filter by savings
        if (needsSavings) {
          if (filters.withSavings === true && savingsAccounts.length === 0) return null
          if (filters.withSavings === false && savingsAccounts.length > 0) return null
          
          // Filter by last deposit date
          if (filters.savingsLastDepositDate && savingsAccounts.length > 0) {
            const filterDate = new Date(filters.savingsLastDepositDate)
            const depositPromises = savingsAccounts.map(account => fetchLatestDepositDate(account.id))
            const depositDates = await Promise.all(depositPromises)
            const hasMatchingDate = depositDates.some(date => date && date >= filterDate)
            if (!hasMatchingDate) return null
          }
        }
        
        // Attach loan and savings data
        client.loans = loans
        client.savingsAccounts = savingsAccounts
        
        return client
      })
      
      // Wait for batch to complete and filter out null results
      const batchResults = await Promise.all(batchPromises)
      filteredClients.push(...batchResults.filter((c: any) => c !== null))
    }
    
    return filteredClients
  } catch (error) {
    console.error('Error fetching clients from Mifos:', error)
    throw error
  }
}

// Fetch offices from Mifos X
async function fetchOffices(partner: any): Promise<any[]> {
  try {
    const basicAuth = getBasicAuth(partner)
    const apiEndpoint = partner.mifos_api_endpoint || '/fineract-provider/api/v1'
    const officesUrl = `${partner.mifos_host_url}${apiEndpoint}/offices`
    
    console.log('Fetching offices from:', officesUrl)
    
    const response = await fetch(officesUrl, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id
      }
    })
    
    console.log('Offices API response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch offices:', response.status, errorText)
      throw new Error(`Failed to fetch offices: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Offices API response data:', data)
    
    // Handle different response formats from Mifos X
    let offices = []
    if (Array.isArray(data)) {
      offices = data
    } else if (data.pageItems && Array.isArray(data.pageItems)) {
      offices = data.pageItems
    } else if (data.content && Array.isArray(data.content)) {
      offices = data.content
    } else if (data.offices && Array.isArray(data.offices)) {
      offices = data.offices
    }
    
    console.log('Parsed offices:', offices.length)
    return offices
  } catch (error) {
    console.error('Error fetching offices:', error)
    throw error // Re-throw so we can catch it in the calling function
  }
}

// Fetch loan officers from Mifos X
async function fetchLoanOfficers(partner: any, officeId?: string): Promise<any[]> {
  try {
    const basicAuth = getBasicAuth(partner)
    const apiEndpoint = partner.mifos_api_endpoint || '/fineract-provider/api/v1'
    let staffUrl = `${partner.mifos_host_url}${apiEndpoint}/staff?loanOfficersOnly=true`
    
    if (officeId) {
      staffUrl += `&officeId=${officeId}`
    }
    
    const response = await fetch(staffUrl, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.pageItems || data || []
    }
    
    return []
  } catch (error) {
    console.error('Error fetching loan officers:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { partner_id, filters } = body

    if (!partner_id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 })
    }

    // Get partner's Mifos X configuration
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partner_id)
      .eq('is_mifos_configured', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({ 
        error: 'Mifos X not configured for this partner',
        details: 'Please configure Mifos X integration in partner settings'
      }, { status: 400 })
    }

    // Fetch clients with filters (using Basic Auth)
    const clients = await fetchClientsFromMifos(partner, filters || {})

    // Format client data with important information
    const formattedClients = clients.map((client: any) => {
      const loans = client.loans || [] // All loans (filtered by status if filter specified)
      const savingsAccounts = client.savingsAccounts || []
      
      // Calculate total loan outstanding across all loans
      let totalLoanOutstanding = 0
      let maxOverdueDays = 0
      let totalLoanAmount = 0
      let primaryLoanId = null
      
      for (const loan of loans) {
        // Extract outstanding amount from multiple possible fields
        const outstandingStr = loan.totalOutstanding || 
                               loan.totalOutstandingAmount || 
                               loan.principalOutstanding || 
                               loan.outstandingPrincipal ||
                               loan.totalPrincipalOutstanding ||
                               loan.summary?.totalOutstanding ||
                               '0'
        const outstanding = parseFloat(outstandingStr.toString().replace(/,/g, '')) || 0
        totalLoanOutstanding += outstanding
        
        // Extract principal amount
        const principalStr = loan.principal || loan.principalAmount || loan.loanAmount || loan.principalDisbursed || loan.summary?.principalDisbursed || '0'
        const principal = parseFloat(principalStr.toString().replace(/,/g, '')) || 0
        totalLoanAmount += principal
        
        // Get maximum overdue days across all loans
        const overdueDays = Number(loan.daysInArrears) || Number(loan.overdueDays) || Number(loan.numberOfDaysOverdue) || 0
        if (overdueDays > maxOverdueDays) {
          maxOverdueDays = overdueDays
          primaryLoanId = loan.id || loan.accountId || loan.loanId || null
        }
        
        // Use first loan's ID if no overdue loan found
        if (!primaryLoanId) {
          primaryLoanId = loan.id || loan.accountId || loan.loanId || null
        }
      }
      
      // Calculate total savings balance across all savings accounts
      const totalSavings = savingsAccounts.reduce((sum: number, acc: any) => {
        // Try multiple possible field names for balance
        const balanceStr = acc.accountBalance || 
                           acc.summary?.accountBalance || 
                           acc.balance || 
                           acc.summary?.balance || 
                           acc.availableBalance ||
                           acc.summary?.availableBalance ||
                           '0'
        const balance = parseFloat(balanceStr.toString().replace(/,/g, '')) || 0
        return sum + balance
      }, 0)
      
      // Get primary loan for additional details
      const primaryLoan = loans.length > 0 ? loans[0] : null
      
      // Calculate loan aging (days since disbursement or activation)
      let loanAge = 0
      if (primaryLoan) {
        const disbursedDate = primaryLoan.disbursedDate || primaryLoan.timeline?.actualDisbursementDate || primaryLoan.timeline?.disbursedOnDate
        if (disbursedDate) {
          const disbursed = new Date(disbursedDate)
          const today = new Date()
          loanAge = Math.floor((today.getTime() - disbursed.getTime()) / (1000 * 60 * 60 * 24))
        }
      }
      
      return {
        id: client.id,
        displayName: client.displayName || `${client.firstname || ''} ${client.lastname || ''}`.trim(),
        accountNo: client.accountNo || client.accountNumber || '',
        mobileNo: client.mobileNo || client.phoneNo || '',
        emailAddress: client.emailAddress || client.email || '',
        officeName: client.officeName || '',
        activationDate: client.activationDate || client.timeline?.activatedOnDate,
        activeLoanCount: loans.filter((loan: any) => isActiveLoan(loan)).length, // Count of active loans only
        totalLoans: loans.length, // Total count of all loans
        loanId: primaryLoanId, // Primary active loan ID
        loanAge: loanAge, // Age of primary loan in days
        totalSavings: totalSavings,
        savingsAccountCount: savingsAccounts.length,
        overdueDays: maxOverdueDays, // Maximum overdue days across all loans
        loanAmount: totalLoanAmount, // Total principal amount across all loans
        loanOutstanding: totalLoanOutstanding, // Total outstanding across all active loans
        // Additional loan details from primary loan
        loanStatus: primaryLoan?.status?.code?.value || primaryLoan?.status?.value || null,
        loanProduct: primaryLoan?.loanProductName || null
      }
    })

    return NextResponse.json({
      success: true,
      clients: formattedClients,
      total: formattedClients.length
    })

  } catch (error) {
    console.error('Error fetching Mifos clients:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clients from Mifos X'
    }, { status: 500 })
  }
}

// GET - Fetch offices and loan officers for filter dropdowns
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')
    const officeId = searchParams.get('office_id')

    if (!partnerId) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 })
    }

    // Get partner's Mifos X configuration
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .eq('is_mifos_configured', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({ 
        error: 'Mifos X not configured for this partner'
      }, { status: 400 })
    }

    try {
      // Fetch offices and loan officers (using Basic Auth)
      let offices: any[] = []
      let loanOfficers: any[] = []
      
      try {
        offices = await fetchOffices(partner)
        console.log('Fetched offices:', offices.length)
      } catch (officeError) {
        console.error('Error fetching offices:', officeError)
        // Continue even if offices fail
      }
      
      try {
        loanOfficers = await fetchLoanOfficers(partner, officeId || undefined)
        console.log('Fetched loan officers:', loanOfficers.length)
      } catch (officerError) {
        console.error('Error fetching loan officers:', officerError)
        // Continue even if loan officers fail
      }

      return NextResponse.json({
        success: true,
        offices: offices.map((o: any) => ({
          id: o.id,
          name: o.name || o.displayName || 'Unknown Office'
        })),
        loanOfficers: loanOfficers.map((o: any) => ({
          id: o.id,
          displayName: o.displayName || (o.firstname && o.lastname ? `${o.firstname} ${o.lastname}` : o.displayName || o.name || 'Unknown'),
          officeId: o.officeId
        }))
      })
    } catch (error) {
      console.error('Error fetching filter options:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch filter options from Mifos X',
        offices: [],
        loanOfficers: []
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error fetching Mifos filter options:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch filter options'
    }, { status: 500 })
  }
}
