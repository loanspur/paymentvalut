'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Building2,
  Activity,
  Server,
  Shield,
  FileText
} from 'lucide-react'

interface AuditLog {
  id: string
  log_type: 'audit' | 'api' | 'user' | 'system'
  timestamp: string
  action: string
  user: string | null
  partner: string | null
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info' | 'error' | 'success' | 'warning'
  origin_ip?: string
  endpoint?: string
  method?: string
  response_status?: number
  metadata?: any
}

interface AuditTrailProps {
  className?: string
}

export default function AuditTrail({ className = '' }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    logType: 'all',
    category: '',
    severity: '',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        type: filters.logType,
        ...(filters.category && { category: filters.category }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate })
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data || [])
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0
        }))
      } else {
        throw new Error(data.error || 'Failed to fetch audit logs')
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, filters])

  const getLogTypeIcon = (logType: string) => {
    switch (logType) {
      case 'audit': return <Shield className="w-4 h-4 text-blue-600" />
      case 'api': return <Activity className="w-4 h-4 text-green-600" />
      case 'user': return <User className="w-4 h-4 text-purple-600" />
      case 'system': return <Server className="w-4 h-4 text-orange-600" />
      default: return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-600" />
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'low': return <Info className="w-4 h-4 text-blue-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'info': return <Info className="w-4 h-4 text-blue-500" />
      default: return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-red-500 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-blue-600 bg-blue-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'success': return 'text-green-600 bg-green-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          logType: filters.logType,
          format: 'csv',
          filters
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.downloadUrl) {
          window.open(data.downloadUrl, '_blank')
        }
      }
    } catch (err) {
      console.error('Error exporting logs:', err)
    }
  }

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setShowDetails(true)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600">Monitor system logs, user activities, and audit trail</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Type
            </label>
            <select
              value={filters.logType}
              onChange={(e) => handleFilterChange('logType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Logs</option>
              <option value="audit">Audit Logs</option>
              <option value="api">API Requests</option>
              <option value="user">User Activities</option>
              <option value="system">System Events</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading audit logs...</span>
        </div>
      )}

      {/* Logs Table */}
      {!loading && !error && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No audit logs found</p>
                      <p className="text-sm">Try adjusting your filters or check back later.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getLogTypeIcon(log.log_type)}
                          <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                            {log.log_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {log.action}
                        </div>
                        {log.endpoint && (
                          <div className="text-xs text-gray-500">
                            {log.method} {log.endpoint}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {log.user || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {log.partner || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1 capitalize">{log.severity}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
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
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
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
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
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
      )}

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Log Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <div className="flex items-center mt-1">
                      {getLogTypeIcon(selectedLog.log_type)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {selectedLog.log_type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getSeverityColor(selectedLog.severity)}`}>
                      {getSeverityIcon(selectedLog.severity)}
                      <span className="ml-1 capitalize">{selectedLog.severity}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.action}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.user || 'System'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Partner</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.partner || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>

                {selectedLog.origin_ip && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Origin IP</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.origin_ip}</p>
                  </div>
                )}

                {selectedLog.endpoint && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.method} {selectedLog.endpoint}</p>
                  </div>
                )}

                {selectedLog.response_status && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Response Status</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.response_status}</p>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Metadata</label>
                    <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}