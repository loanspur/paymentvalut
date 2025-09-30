'use client'

import { useState, useEffect } from 'react'
import { 
  RefreshCw,
  Search,
  Filter,
  Phone,
  CreditCard,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar
} from 'lucide-react'

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
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    loadDisbursements()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDisbursements, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDisbursements = async () => {
    try {
      // Use the same API endpoint as the dashboard for consistency
      const response = await fetch('/api/dashboard/recent-transactions?limit=100')
      const data = await response.json()
      if (data.success) {
        setDisbursements(data.data)
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

    const matchesDate = (() => {
      if (dateFilter === 'all') return true
      const disbursementDate = new Date(disbursement.createdAt)
      const now = new Date()
      
      switch (dateFilter) {
        case 'today':
          return disbursementDate.toDateString() === now.toDateString()
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return disbursementDate >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return disbursementDate >= monthAgo
        default:
          return true
      }
    })()

    return matchesSearch && matchesStatus && matchesDate
  })

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
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadDisbursements}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            Partner Transactions ({filteredDisbursements.length})
          </h2>
          <div className="flex items-center text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 mr-1" />
            Auto-refresh: 30s
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
                {filteredDisbursements.map((disbursement) => (
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
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'No disbursements have been made yet'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && dateFilter === 'all' && (
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
      </div>
    </div>
  )
}