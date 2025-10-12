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
import { formatCurrency, formatDate, downloadFile } from '../../lib/utils'

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

export default function HistoryPage() {
  const [disbursements, setDisbursements] = useState<DisbursementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [isExporting, setIsExporting] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_VALUES.PAGINATION.ITEMS_PER_PAGE)

  useEffect(() => {
    loadDisbursements()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDisbursements, AUTO_REFRESH_INTERVALS.TRANSACTION_HISTORY)
    return () => clearInterval(interval)
  }, [])

  const loadDisbursements = async () => {
    try {
      // Use the same API endpoint as the dashboard for consistency
      const response = await fetch(`/api/dashboard/recent-transactions?limit=${DEFAULT_VALUES.PAGINATION.MAX_ITEMS_PER_PAGE}`)
      const data = await response.json()
      if (data.success) {
        setDisbursements(data.data)
      }
    } catch (error) {
      // Failed to fetch disbursements
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

  const filteredDisbursements = disbursements.filter(disbursement => {
    const matchesSearch = 
      disbursement.msisdn.includes(searchTerm) ||
      disbursement.partner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disbursement.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disbursement.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (disbursement.conversationId && disbursement.conversationId.includes(searchTerm)) ||
      (disbursement.transactionReceipt && disbursement.transactionReceipt.includes(searchTerm)) ||
      (disbursement.mpesaTransactionId && disbursement.mpesaTransactionId.includes(searchTerm))

    const matchesStatus = statusFilter === 'all' || disbursement.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Pagination calculations
  const totalItems = filteredDisbursements.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredDisbursements.slice(startIndex, endIndex)

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToFirstPage = () => goToPage(1)
  const goToLastPage = () => goToPage(totalPages)
  const goToPreviousPage = () => goToPage(currentPage - 1)
  const goToNextPage = () => goToPage(currentPage + 1)

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, currentPage + 2)
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) {
          pages.push('...')
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const exportToCSV = () => {
    if (filteredDisbursements.length === 0) {
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
      const csvData = filteredDisbursements.map(disbursement => [
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
        new Date(disbursement.createdAt).toLocaleDateString(),
        new Date(disbursement.createdAt).toLocaleTimeString(),
        new Date(disbursement.updatedAt).toLocaleDateString(),
        new Date(disbursement.updatedAt).toLocaleTimeString()
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
    if (filteredDisbursements.length === 0) {
      alert('No data to export')
      return
    }

    setIsExporting(true)
    
    try {
      // Prepare JSON data with additional metadata
      const exportData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          totalRecords: filteredDisbursements.length,
          dateRange: {
            startDate: exportDateRange.startDate || 'all',
            endDate: exportDateRange.endDate || 'all'
          },
          filters: {
            searchTerm,
            statusFilter
          }
        },
        transactions: filteredDisbursements.map(disbursement => ({
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
      {/* Combined Search, Filters & Export Section */}
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Search & Export</h3>
              <p className="text-sm text-gray-500">Filter transactions and export data in various formats</p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Download className="h-4 w-4 mr-1" />
              {filteredDisbursements.length} records
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search transactions..."
                />
              </div>
            </div>

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
                <option value="success">Success</option>
                <option value="queued">Queued</option>
                <option value="accepted">Accepted</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Export Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Export Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Export Date Range
                </label>
                
                {/* Quick Date Range Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setQuickDateRange('today')}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      exportDateRange.startDate === new Date().toISOString().split('T')[0] && exportDateRange.endDate === new Date().toISOString().split('T')[0]
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setQuickDateRange('week')}
                    className="px-2 py-1 text-xs rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setQuickDateRange('month')}
                    className="px-2 py-1 text-xs rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    30 Days
                  </button>
                  <button
                    onClick={() => setQuickDateRange('quarter')}
                    className="px-2 py-1 text-xs rounded-full border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    90 Days
                  </button>
                </div>

                {/* Custom Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={exportDateRange.startDate}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={exportDateRange.endDate}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Export Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Export Format
                </label>
                
                <div className="space-y-2">
                  <button
                    onClick={exportToCSV}
                    disabled={isExporting || filteredDisbursements.length === 0}
                    className="w-full flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    Export CSV
                  </button>
                  
                  <button
                    onClick={exportToJSON}
                    disabled={isExporting || filteredDisbursements.length === 0}
                    className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Export JSON
                  </button>
                </div>
              </div>

              {/* Export Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Export Info
                </label>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      CSV: All transaction details
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      JSON: Includes metadata
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      Respects current filters
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      Auto-named files
                    </div>
                  </div>
                </div>
              </div>
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
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} transactions
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
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
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

        {filteredDisbursements.length > 0 ? (
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
                {currentItems.map((disbursement) => (
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
                          {new Date(disbursement.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(disbursement.createdAt).toLocaleTimeString()}
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

        {/* Pagination Controls */}
        {filteredDisbursements.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Pagination Info */}
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages} ({totalItems} total transactions)
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {/* First Page */}
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && goToPage(page)}
                      disabled={page === '...'}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        page === currentPage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : page === '...'
                          ? 'border-transparent text-gray-400 cursor-default'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Next Page */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
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