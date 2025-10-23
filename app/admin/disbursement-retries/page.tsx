'use client'

import { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Play,
  Pause,
  Filter,
  Download,
  Search,
  Eye,
  RotateCcw
} from 'lucide-react'

interface Disbursement {
  id: string
  partner_id: string
  partner_name: string
  amount: number
  msisdn: string
  status: string
  retry_count: number
  max_retries: number
  retry_reason: string
  next_retry_at: string
  next_retry_at_formatted: string
  can_retry: boolean
  created_at: string
  updated_at: string
  result_code: string
  result_desc: string
  retry_logs: RetryLog[]
}

interface RetryLog {
  id: string
  disbursement_id: string
  retry_attempt: number
  retry_reason: string
  mpesa_response_code: string
  mpesa_response_description: string
  error_details: any
  retry_timestamp: string
}

interface Summary {
  total_disbursements: number
  successful_disbursements: number
  failed_disbursements: number
  pending_disbursements: number
  disbursements_with_retries: number
  max_retry_count: number
  today_disbursements: number
}

export default function DisbursementRetriesPage() {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    partner_id: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  })
  const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null)
  const [showRetryLogs, setShowRetryLogs] = useState(false)

  useEffect(() => {
    loadDisbursements()
  }, [filters, pagination.page])

  const loadDisbursements = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.status) params.append('status', filters.status)
      if (filters.partner_id) params.append('partner_id', filters.partner_id)

      const response = await fetch(`/api/disburse/retry?${params}`)
      const data = await response.json()

      if (data.success) {
        let filteredData = data.data

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredData = filteredData.filter((d: Disbursement) =>
            d.partner_name.toLowerCase().includes(searchLower) ||
            d.msisdn.includes(searchLower) ||
            d.id.toLowerCase().includes(searchLower)
          )
        }

        setDisbursements(filteredData)
        setSummary(data.summary)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          total_pages: data.pagination.total_pages
        }))
      } else {
        console.error('Failed to load disbursements:', data.error)
      }
    } catch (error) {
      console.error('Error loading disbursements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (disbursementId: string, forceRetry = false) => {
    try {
      setRetrying(disbursementId)
      
      const response = await fetch('/api/disburse/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disbursement_id: disbursementId,
          force_retry: forceRetry
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`Retry ${data.success ? 'successful' : 'failed'}: ${data.message}`)
        loadDisbursements() // Refresh the list
      } else {
        alert(`Retry failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error retrying disbursement:', error)
      alert('Error retrying disbursement')
    } finally {
      setRetrying(null)
    }
  }

  const handleRetryAll = async () => {
    try {
      setRetrying('all')
      
      const response = await fetch('/api/disburse/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (data.success) {
        alert(`Retry process completed: ${data.success_count} successful, ${data.failure_count} failed`)
        loadDisbursements() // Refresh the list
      } else {
        alert(`Retry process failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error retrying all disbursements:', error)
      alert('Error retrying all disbursements')
    } finally {
      setRetrying(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const downloadCSV = () => {
    const headers = [
      'ID', 'Partner', 'Amount', 'Phone', 'Status', 'Retry Count', 
      'Max Retries', 'Next Retry', 'Created At', 'Result Code', 'Result Description'
    ]
    
    const csvData = disbursements.map(d => [
      d.id,
      d.partner_name,
      d.amount,
      d.msisdn,
      d.status,
      d.retry_count,
      d.max_retries,
      d.next_retry_at_formatted || 'N/A',
      new Date(d.created_at).toLocaleString(),
      d.result_code || 'N/A',
      d.result_desc || 'N/A'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `disbursement-retries-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Disbursement Retry Management</h1>
        <p className="text-gray-600">Monitor and manage failed disbursement retries</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Disbursements</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_disbursements}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-gray-900">{summary.successful_disbursements}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{summary.failed_disbursements}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <RotateCcw className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Retries</p>
                <p className="text-2xl font-bold text-gray-900">{summary.disbursements_with_retries}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search disbursements..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRetryAll}
              disabled={retrying === 'all'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retrying === 'all' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Retry All Eligible
            </button>

            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>

            <button
              onClick={loadDisbursements}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Disbursements Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disbursement
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
                  Retry Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Retry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Loading disbursements...</p>
                  </td>
                </tr>
              ) : disbursements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <AlertCircle className="w-6 h-6 mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">No disbursements found</p>
                  </td>
                </tr>
              ) : (
                disbursements.map((disbursement) => (
                  <tr key={disbursement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {disbursement.id.substring(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          {disbursement.msisdn}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{disbursement.partner_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        KSh {disbursement.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(disbursement.status)}
                        <span className={getStatusBadge(disbursement.status)}>
                          {disbursement.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {disbursement.retry_count}/{disbursement.max_retries}
                      </div>
                      {disbursement.retry_reason && (
                        <div className="text-xs text-gray-500">
                          {disbursement.retry_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {disbursement.next_retry_at_formatted || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedDisbursement(disbursement)
                            setShowRetryLogs(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {disbursement.can_retry && (
                          <button
                            onClick={() => handleRetry(disbursement.id)}
                            disabled={retrying === disbursement.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {retrying === disbursement.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.total_pages, prev.page + 1) }))}
                disabled={pagination.page === pagination.total_pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.total_pages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.total_pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Retry Logs Modal */}
      {showRetryLogs && selectedDisbursement && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Retry Logs - {selectedDisbursement.id.substring(0, 8)}...
                </h3>
                <button
                  onClick={() => setShowRetryLogs(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedDisbursement.retry_logs.length === 0 ? (
                  <p className="text-gray-500">No retry logs available</p>
                ) : (
                  selectedDisbursement.retry_logs.map((log, index) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Attempt {log.retry_attempt}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(log.retry_timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{log.retry_reason}</p>
                      {log.mpesa_response_code && (
                        <div className="text-sm">
                          <span className="font-medium">Response Code:</span> {log.mpesa_response_code}
                        </div>
                      )}
                      {log.mpesa_response_description && (
                        <div className="text-sm">
                          <span className="font-medium">Description:</span> {log.mpesa_response_description}
                        </div>
                      )}
                      {log.error_details && Object.keys(log.error_details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm font-medium cursor-pointer">Error Details</summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(log.error_details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

