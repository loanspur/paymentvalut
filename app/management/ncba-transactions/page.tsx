'use client'

import { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Filter, 
  Download, 
  Search, 
  RefreshCw,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Eye,
  UserPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface NCBATransaction {
  id: string
  transaction_id: string
  transaction_type: string
  transaction_time: string
  transaction_amount: number
  business_short_code: string
  bill_reference_number: string
  customer_phone: string
  customer_name: string
  status: string
  partner_id?: string
  partner_name?: string
  created_at: string
  raw_notification: any
}

interface Partner {
  id: string
  name: string
  contact_email: string
  is_active: boolean
}

export default function NCBATransactionsPage() {
  const [transactions, setTransactions] = useState<NCBATransaction[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    partner_id: '',
    transaction_type: '',
    search: '',
    start_date: '',
    end_date: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [selectedTransaction, setSelectedTransaction] = useState<NCBATransaction | null>(null)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState('')

  useEffect(() => {
    loadTransactions()
    loadPartners()
  }, [pagination.page, filters])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      })

      const response = await fetch(`/api/c2b/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.data || [])
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: Math.ceil((data.pagination?.total || 0) / pagination.limit)
        }))
      }
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPartners = async () => {
    try {
      const response = await fetch('/api/partners')
      if (response.ok) {
        const data = await response.json()
        setPartners(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load partners:', error)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      partner_id: '',
      transaction_type: '',
      search: '',
      start_date: '',
      end_date: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleAllocatePartner = async () => {
    if (!selectedTransaction || !selectedPartner) return

    try {
      const response = await fetch(`/api/c2b/transactions/${selectedTransaction.id}/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partner_id: selectedPartner
        })
      })

      if (response.ok) {
        alert('Partner allocated successfully!')
        setShowAllocationModal(false)
        setSelectedTransaction(null)
        setSelectedPartner('')
        loadTransactions()
      } else {
        alert('Failed to allocate partner')
      }
    } catch (error) {
      console.error('Failed to allocate partner:', error)
      alert('Failed to allocate partner')
    }
  }

  const downloadCSV = () => {
    const headers = [
      'Transaction ID',
      'Type',
      'Amount',
      'Customer Name',
      'Customer Phone',
      'Account Reference',
      'Status',
      'Partner',
      'Date'
    ]

    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        t.transaction_id,
        t.transaction_type,
        t.transaction_amount,
        `"${t.customer_name || ''}"`,
        t.customer_phone,
        t.bill_reference_number,
        t.status,
        `"${t.partner_name || 'Unallocated'}"`,
        new Date(t.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ncba-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile First */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center">
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">NCBA Transactions</h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage NCBA Paybill transactions and partner allocations</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={downloadCSV}
                className="px-3 py-2 sm:px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </button>
              <button
                onClick={loadTransactions}
                className="px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Mobile First */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 flex items-center">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Filters
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner</label>
              <select
                value={filters.partner_id}
                onChange={(e) => handleFilterChange('partner_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Partners</option>
                <option value="unallocated">Unallocated</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
              <select
                value={filters.transaction_type}
                onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="PAYBILL">Paybill</option>
                <option value="TILLNUMBER">Till Number</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Transactions ({pagination.total})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500">No transactions match your current filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.transaction_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.transaction_type}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.customer_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.customer_phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatAmount(transaction.transaction_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.bill_reference_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusIcon(transaction.status)}
                          <span className="ml-1">{transaction.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.partner_name || (
                            <span className="text-gray-500 italic">Unallocated</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                          {!transaction.partner_id && (
                            <button
                              onClick={() => {
                                setSelectedTransaction(transaction)
                                setShowAllocationModal(true)
                              }}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Allocate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {((pagination.page - 1) * pagination.limit) + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span>{' '}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + i
                      if (pageNum > pagination.totalPages) return null
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === pagination.page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Partner Allocation Modal */}
      {showAllocationModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Allocate Partner
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Transaction: <span className="font-medium">{selectedTransaction.transaction_id}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Amount: <span className="font-medium">{formatAmount(selectedTransaction.transaction_amount)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Customer: <span className="font-medium">{selectedTransaction.customer_name}</span>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Partner
                </label>
                <select
                  value={selectedPartner}
                  onChange={(e) => setSelectedPartner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a partner...</option>
                  {partners.filter(p => p.is_active).map(partner => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAllocationModal(false)
                    setSelectedTransaction(null)
                    setSelectedPartner('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocatePartner}
                  disabled={!selectedPartner}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Allocate Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


