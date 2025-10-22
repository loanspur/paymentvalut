'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Download, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  User,
  Building2,
  Phone,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface LoanTrackingRecord {
  id: string
  partner_id: string
  partner_name: string
  loan_id: number
  client_id: number
  client_name?: string
  loan_amount: number
  phone_number?: string
  status: string
  disbursement_id?: string
  disbursement_status?: string
  mpesa_receipt_number?: string
  error_message?: string
  created_at: string
  updated_at: string
}

interface FilterOptions {
  status: string
  partner: string
  dateRange: {
    start: string
    end: string
  }
  search: string
}

export default function LoanTrackingPage() {
  const [loans, setLoans] = useState<LoanTrackingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    partner: 'all',
    dateRange: {
      start: '',
      end: ''
    },
    search: ''
  })

  useEffect(() => {
    fetchLoanTrackingData()
  }, [])

  const fetchLoanTrackingData = async () => {
    try {
      setLoading(true)
      
      // Check if loan_tracking table exists first
      const { data, error } = await supabase
        .from('loan_tracking')
        .select(`
          *,
          partners!inner(name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching loan tracking data:', error)
        
        // If table doesn't exist, show empty state
        if (error.code === 'PGRST116' || error.message.includes('relation "loan_tracking" does not exist')) {
          console.log('Loan tracking table does not exist yet')
          setLoans([])
          return
        }
        
        // For other errors, still show empty state
        setLoans([])
        return
      }

      // Transform the data to include partner name
      const transformedData = data?.map(record => ({
        ...record,
        partner_name: record.partners?.name || 'Unknown Partner'
      })) || []

      setLoans(transformedData)
    } catch (error) {
      console.error('Error fetching loan tracking data:', error)
      setLoans([])
    } finally {
      setLoading(false)
    }
  }

  // Get unique partners for filter dropdown
  const uniquePartners = useMemo(() => {
    const partners = Array.from(new Set(loans.map(loan => loan.partner_name)))
    return partners.sort()
  }, [loans])

  // Filter and search logic
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      // Status filter
      if (filters.status !== 'all') {
        switch (filters.status) {
          case 'pending':
            if (!(loan.status === 'pending' || loan.status === 'approved')) return false
            break
          case 'disbursed':
            if (!(loan.status === 'disbursed' && loan.disbursement_status === 'completed')) return false
            break
          case 'failed':
            if (!(loan.status === 'failed' || loan.disbursement_status === 'failed')) return false
            break
        }
      }

      // Partner filter
      if (filters.partner !== 'all' && loan.partner_name !== filters.partner) {
        return false
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const loanDate = new Date(loan.created_at)
        if (filters.dateRange.start && loanDate < new Date(filters.dateRange.start)) return false
        if (filters.dateRange.end && loanDate > new Date(filters.dateRange.end)) return false
      }

      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const searchableFields = [
          loan.loan_id.toString(),
          loan.client_id.toString(),
          loan.client_name || '',
          loan.partner_name,
          loan.phone_number || '',
          loan.mpesa_receipt_number || ''
        ]
        if (!searchableFields.some(field => field.toLowerCase().includes(searchTerm))) {
          return false
        }
      }

      return true
    })
  }, [loans, filters])

  // Pagination logic
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLoans = filteredLoans.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const getStatusBadge = (status: string, disbursementStatus?: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    
    if (status === 'disbursed' && disbursementStatus === 'completed') {
      return `${baseClasses} bg-green-100 text-green-800`
    } else if (status === 'failed' || disbursementStatus === 'failed') {
      return `${baseClasses} bg-red-100 text-red-800`
    } else if (status === 'pending' || status === 'approved') {
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    } else {
      return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusIcon = (status: string, disbursementStatus?: string) => {
    if (status === 'disbursed' && disbursementStatus === 'completed') {
      return <CheckCircle className="w-3 h-3 mr-1" />
    } else if (status === 'failed' || disbursementStatus === 'failed') {
      return <XCircle className="w-3 h-3 mr-1" />
    } else if (status === 'pending' || status === 'approved') {
      return <Clock className="w-3 h-3 mr-1" />
    } else {
      return <AlertCircle className="w-3 h-3 mr-1" />
    }
  }

  const getStatusText = (status: string, disbursementStatus?: string) => {
    if (status === 'disbursed' && disbursementStatus === 'completed') {
      return 'Disbursed'
    } else if (status === 'failed' || disbursementStatus === 'failed') {
      return 'Failed'
    } else if (status === 'pending' || status === 'approved') {
      return 'Pending Disbursement'
    } else {
      return status
    }
  }

  // Download functionality
  const downloadCSV = () => {
    const headers = [
      'Loan ID',
      'Client ID',
      'Client Name',
      'Partner',
      'Amount (KES)',
      'Phone Number',
      'Status',
      'Disbursement Status',
      'M-Pesa Receipt',
      'Created Date',
      'Updated Date'
    ]

    const csvContent = [
      headers.join(','),
      ...filteredLoans.map(loan => [
        loan.loan_id,
        loan.client_id,
        `"${loan.client_name || 'N/A'}"`,
        `"${loan.partner_name}"`,
        loan.loan_amount,
        loan.phone_number || 'N/A',
        `"${getStatusText(loan.status, loan.disbursement_status)}"`,
        `"${loan.disbursement_status || 'N/A'}"`,
        loan.mpesa_receipt_number || 'N/A',
        new Date(loan.created_at).toLocaleDateString(),
        new Date(loan.updated_at).toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `loan-tracking-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      partner: 'all',
      dateRange: { start: '', end: '' },
      search: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Loan Tracking Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Monitor approved loans and their disbursement progress
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Loans</dt>
                    <dd className="text-lg font-medium text-gray-900">{loans.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loans.filter(l => l.status === 'pending' || l.status === 'approved').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Disbursed</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loans.filter(l => l.status === 'disbursed' && l.disbursement_status === 'completed').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loans.filter(l => l.status === 'failed' || l.disbursement_status === 'failed').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search loans..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="disbursed">Disbursed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Partner Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Partner</label>
                <select
                  value={filters.partner}
                  onChange={(e) => setFilters(prev => ({ ...prev, partner: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Partners</option>
                  {uniquePartners.map(partner => (
                    <option key={partner} value={partner}>{partner}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No loans found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.status === 'all' && filters.partner === 'all' && !filters.search && !filters.dateRange.start && !filters.dateRange.end
                    ? loans.length === 0 
                      ? 'No loan approvals have been received yet. The loan tracking table may not be set up.'
                      : 'No loan approvals have been received yet.'
                    : 'No loans match your current filters.'
                  }
                </p>
                {loans.length === 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Setup Required:</strong> To start tracking loans, you need to:
                    </p>
                    <ul className="mt-2 text-sm text-blue-600 list-disc list-inside">
                      <li>Run the loan tracking table creation script in your Supabase SQL editor</li>
                      <li>Configure Mifos X webhook integration in your partner settings</li>
                      <li>Approve loans in your Mifos X system to see them appear here</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Loan Records ({filteredLoans.length} total)
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-500">Show:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <button
                      onClick={fetchLoanTrackingData}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loan Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Loan #{loan.loan_id}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {loan.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {loan.client_name || 'Unknown Client'}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {loan.client_id}
                              </div>
                              {loan.phone_number && (
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {loan.phone_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {loan.partner_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            KSh {loan.loan_amount?.toLocaleString()}
                          </div>
                          {loan.mpesa_receipt_number && (
                            <div className="text-xs text-gray-500">
                              Receipt: {loan.mpesa_receipt_number}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(loan.status, loan.disbursement_status)}>
                            {getStatusIcon(loan.status, loan.disbursement_status)}
                            {getStatusText(loan.status, loan.disbursement_status)}
                          </span>
                          {loan.error_message && (
                            <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={loan.error_message}>
                              {loan.error_message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div>{new Date(loan.created_at).toLocaleDateString()}</div>
                              <div className="text-xs">{new Date(loan.created_at).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(endIndex, filteredLoans.length)}</span> of{' '}
                        <span className="font-medium">{filteredLoans.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                          if (pageNum > totalPages) return null
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
