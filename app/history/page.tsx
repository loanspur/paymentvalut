'use client'

import { useState, useEffect } from 'react'
import { 
  RefreshCw,
  Search,
  Phone,
  CreditCard,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { AUTO_REFRESH_INTERVALS, DEFAULT_VALUES } from '../../lib/constants'
import { formatCurrency, formatDate, formatDateTime, formatDateOnly, formatTimeOnly, downloadFile } from '../../lib/utils'

interface DisbursementRequest {
  id: string
  partner: string
  shortCode: string
  amount: number
  msisdn: string
  status: string
  resultCode?: string
  resultDesc?: string
  conversationId?: string
  transactionReceipt?: string
  mpesaTransactionId?: string
  customerName: string
  timeAgo: string
  createdAt: string
  updatedAt: string
  // Utility balance data
  utilityBalanceAtTransaction?: number
  workingBalanceAtTransaction?: number
  chargesBalanceAtTransaction?: number
  balanceUpdatedAtTransaction?: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalRecords: number
  recordsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  startRecord: number
  endRecord: number
}

export default function HistoryPage() {
  const [disbursements, setDisbursements] = useState<DisbursementRequest[]>([])
  const [allDisbursements, setAllDisbursements] = useState<DisbursementRequest[]>([]) // Store all data for client-side filtering
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('') // Debounced search term
  const [statusFilter, setStatusFilter] = useState('all')
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [isExporting, setIsExporting] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(50) // Increased default
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  
  // Filter state
  const [filterDateRange, setFilterDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load data only when pagination or date filters change (client-side filtering for search/status)
  useEffect(() => {
    loadDisbursements()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDisbursements, AUTO_REFRESH_INTERVALS.TRANSACTION_HISTORY)
    return () => clearInterval(interval)
  }, [currentPage, itemsPerPage, filterDateRange])

  // Client-side filtering when search term or status changes
  useEffect(() => {
    setIsFiltering(true)
    
    // Small delay to show filtering state for better UX
    const timer = setTimeout(() => {
      let filtered = allDisbursements

      // Apply search filter
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase()
        filtered = filtered.filter(disbursement => {
          return (
            disbursement.customerName?.toLowerCase().includes(searchLower) ||
            disbursement.msisdn?.includes(searchTerm) ||
            disbursement.mpesaTransactionId?.toLowerCase().includes(searchLower) ||
            disbursement.transactionReceipt?.toLowerCase().includes(searchLower) ||
            disbursement.conversationId?.toLowerCase().includes(searchLower) ||
            disbursement.partner?.toLowerCase().includes(searchLower)
          )
        })
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(disbursement => 
          disbursement.status?.toLowerCase() === statusFilter.toLowerCase()
        )
      }

      setDisbursements(filtered)
      setIsFiltering(false)
    }, 100) // Brief delay for smooth UX

    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, allDisbursements])

  const loadDisbursements = async () => {
    try {
      setLoading(true)
      
      // Build query parameters - only use date filters and pagination for server calls
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        page: currentPage.toString(),
        ...(filterDateRange.startDate && { startDate: filterDateRange.startDate }),
        ...(filterDateRange.endDate && { endDate: filterDateRange.endDate })
      })
      
      const response = await fetch(`/api/dashboard/recent-transactions?${params}`)
      const data = await response.json()
      
      if (data.success) {
        // Store all data for client-side filtering
        setAllDisbursements(data.data)
        setDisbursements(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch disbursements:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending':
      case 'queued':
      case 'accepted':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'pending':
      case 'queued':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Reset pagination when date filters change (client-side filtering doesn't need pagination reset)
  useEffect(() => {
    setCurrentPage(1)
  }, [filterDateRange])

  const exportToCSV = () => {
    if (disbursements.length === 0) {
      alert('No data to export')
      return
    }

    setIsExporting(true)
    
    try {
      // Prepare CSV headers
      const headers = [
        'Transaction ID',
        'M-Pesa ID',
        'Customer Name',
        'Phone Number',
        'Amount (KES)',
        'Status',
        'Result Description',
        'Partner',
        'Short Code',
        'Utility Balance',
        'Working Balance',
        'Charges Balance',
        'Created Date',
        'Created Time',
        'Updated Date',
        'Updated Time'
      ]

      // Prepare CSV data
      const csvData = disbursements.map(disbursement => [
        disbursement.id,
        disbursement.mpesaTransactionId || disbursement.transactionReceipt || disbursement.conversationId || 'N/A',
        disbursement.customerName || 'N/A',
        disbursement.msisdn,
        disbursement.amount,
        disbursement.status,
        disbursement.resultDesc || 'N/A',
        disbursement.partner,
        disbursement.shortCode,
        disbursement.utilityBalanceAtTransaction || 'N/A',
        disbursement.workingBalanceAtTransaction || 'N/A',
        disbursement.chargesBalanceAtTransaction || 'N/A',
        formatDateOnly(disbursement.createdAt),
        formatTimeOnly(disbursement.createdAt),
        formatDateOnly(disbursement.updatedAt),
        formatTimeOnly(disbursement.updatedAt)
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      // Generate filename with date range
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const startDate = exportDateRange.startDate || 'all'
      const endDate = exportDateRange.endDate || 'all'
      link.setAttribute('download', `transaction_history_${startDate}_to_${endDate}_${dateStr}.csv`)
      
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToJSON = () => {
    if (disbursements.length === 0) {
      alert('No data to export')
      return
    }

    setIsExporting(true)
    
    try {
      // Prepare JSON data with additional metadata
      const exportData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          totalRecords: disbursements.length,
          dateRange: {
            startDate: exportDateRange.startDate || 'all',
            endDate: exportDateRange.endDate || 'all'
          },
          filters: {
            searchTerm,
            statusFilter
          }
        },
        transactions: disbursements.map(disbursement => ({
          id: disbursement.id,
          mpesaTransactionId: disbursement.mpesaTransactionId || disbursement.transactionReceipt || disbursement.conversationId || null,
          customerName: disbursement.customerName || null,
          msisdn: disbursement.msisdn,
          amount: disbursement.amount,
          status: disbursement.status,
          resultDesc: disbursement.resultDesc || null,
          partner: disbursement.partner,
          shortCode: disbursement.shortCode,
          utilityBalanceAtTransaction: disbursement.utilityBalanceAtTransaction || null,
          workingBalanceAtTransaction: disbursement.workingBalanceAtTransaction || null,
          chargesBalanceAtTransaction: disbursement.chargesBalanceAtTransaction || null,
          createdAt: disbursement.createdAt,
          updatedAt: disbursement.updatedAt
        }))
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      // Generate filename with date range
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const startDate = exportDateRange.startDate || 'all'
      const endDate = exportDateRange.endDate || 'all'
      link.setAttribute('download', `transaction_history_${startDate}_to_${endDate}_${dateStr}.json`)
      
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const setQuickDateRange = (range: string) => {
      const now = new Date()
    let startDate = ''
    let endDate = now.toISOString().split('T')[0]
      
    switch (range) {
        case 'today':
        startDate = now.toISOString().split('T')[0]
        break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        startDate = weekAgo.toISOString().split('T')[0]
        break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        startDate = monthAgo.toISOString().split('T')[0]
        break
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        startDate = quarterAgo.toISOString().split('T')[0]
        break
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        startDate = yearAgo.toISOString().split('T')[0]
        break
    }

    setExportDateRange({ startDate, endDate })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Enhanced Filtering Section */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Transactions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
                {isFiltering && (
                  <span className="ml-2 text-xs text-blue-600 flex items-center">
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    Filtering...
                  </span>
                )}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Phone, name, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="error">Error</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filterDateRange.startDate}
                onChange={(e) => setFilterDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filterDateRange.endDate}
                onChange={(e) => setFilterDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterDateRange({ startDate: '', endDate: '' })}
                className="px-3 py-1 text-sm rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                All Time
              </button>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  setFilterDateRange({ startDate: today, endDate: today })
                }}
                className="px-3 py-1 text-sm rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  const today = new Date().toISOString().split('T')[0]
                  setFilterDateRange({ startDate: weekAgo, endDate: today })
                }}
                className="px-3 py-1 text-sm rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  const today = new Date().toISOString().split('T')[0]
                  setFilterDateRange({ startDate: monthAgo, endDate: today })
                }}
                className="px-3 py-1 text-sm rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => {
                  const quarterAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  const today = new Date().toISOString().split('T')[0]
                  setFilterDateRange({ startDate: quarterAgo, endDate: today })
                }}
                className="px-3 py-1 text-sm rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Last 90 Days
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
          <h2 className="text-lg font-medium text-gray-900">
                Partner Transactions
          </h2>
              <p className="text-sm text-gray-500">
                {pagination ? 
                  `Showing ${disbursements.length} of ${pagination.totalRecords} transactions` :
                  `Loading...`
                }
                {(searchTerm || statusFilter !== 'all') && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (filtered)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 mr-1" />
            Auto-refresh: 30s
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>
          </div>
        </div>

        {disbursements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    M-Pesa ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Customer Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Phone
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Utility Balance
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Partner
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Date/Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {disbursements.map((disbursement) => (
                  <tr key={disbursement.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="text-xs font-mono text-gray-900 truncate" title={disbursement.mpesaTransactionId || disbursement.transactionReceipt || disbursement.conversationId || 'N/A'}>
                        {disbursement.mpesaTransactionId || disbursement.transactionReceipt || disbursement.conversationId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-900 truncate" title={disbursement.customerName || 'N/A'}>
                        {disbursement.customerName || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-900">
                        {disbursement.msisdn}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-medium text-gray-900">
                        KES {disbursement.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-900">
                        {disbursement.utilityBalanceAtTransaction ? 
                          `KES ${disbursement.utilityBalanceAtTransaction.toLocaleString()}` : 
                          'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        {getStatusIcon(disbursement.status)}
                        <span className={`ml-1 inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(disbursement.status)}`}>
                          {disbursement.status}
                        </span>
                      </div>
                      {disbursement.resultDesc && disbursement.resultDesc.trim() && (
                        <div className="text-xs text-gray-500 mt-1 truncate" title={disbursement.resultDesc}>
                          {disbursement.resultDesc}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-900 truncate" title={disbursement.partner}>
                        {disbursement.partner}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>
                        <div className="text-xs text-gray-900">
                          {formatDateOnly(disbursement.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeOnly(disbursement.createdAt)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'No disbursements have been made yet'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <a
                href="/disburse"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Create First Disbursement
              </a>
            )}
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Pagination Info */}
              <div className="text-sm text-gray-700">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} total transactions)
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={!pagination.hasPrevPage}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const startPage = Math.max(1, pagination.currentPage - 2)
                    const page = startPage + i
                    if (page > pagination.totalPages) return null
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          page === pagination.currentPage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={!pagination.hasNextPage}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}