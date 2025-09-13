'use client'

import { useState, useEffect } from 'react'
import { Download, Eye, RefreshCw, Search, Filter } from 'lucide-react'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'

interface DisbursementLog {
  disbursementId: string
  status: string
  amount: number
  msisdn: string
  conversationId: string
  resultCode: string
  resultDesc: string
  partner: string
  mpesaShortcode: string
  environment: string
  createdAt: string
  updatedAt: string
  clientRequestId: string
  tenantId: string
  customerId: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<DisbursementLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedLog, setSelectedLog] = useState<DisbursementLog | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    loadLogs()
  }, [selectedStatus])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const url = selectedStatus 
        ? `/api/logs/disbursement?status=${selectedStatus}&limit=50`
        : '/api/logs/disbursement?limit=50'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.logs)
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load disbursement logs'
        })
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load disbursement logs'
      })
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = () => {
    const csvContent = [
      'Disbursement ID,Status,Amount,MSISDN,Conversation ID,Result Code,Result Description,Partner,MPesa Shortcode,Environment,Created At,Updated At,Client Request ID,Tenant ID,Customer ID',
      ...logs.map(log => [
        log.disbursementId,
        log.status,
        log.amount,
        log.msisdn,
        log.conversationId || '',
        log.resultCode || '',
        log.resultDesc || '',
        log.partner,
        log.mpesaShortcode,
        log.environment,
        log.createdAt,
        log.updatedAt,
        log.clientRequestId,
        log.tenantId,
        log.customerId
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `disbursement-logs-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    addNotification({
      type: 'success',
      title: 'Export Successful',
      message: 'Disbursement logs exported to CSV file'
    })
  }

  const viewDetailedLog = async (disbursementId: string) => {
    try {
      const response = await fetch('/api/logs/disbursement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disbursementId })
      })
      
      const data = await response.json()
      if (data.success) {
        setSelectedLog(data.disbursement)
        setShowModal(true)
      }
    } catch (error) {
      console.error('Failed to load detailed log:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addNotification({
      type: 'success',
      title: 'Copied',
      message: 'Text copied to clipboard'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'queued': return 'text-yellow-600 bg-yellow-100'
      case 'completed': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <>
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Disbursement Logs</h1>
            <p className="text-gray-600">
              View and export disbursement transaction logs for Safaricom support
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="accepted">Accepted</option>
                    <option value="failed">Failed</option>
                    <option value="queued">Queued</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <button
                  onClick={loadLogs}
                  disabled={loading}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <button
                onClick={exportLogs}
                className="btn btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Transaction Logs ({logs.length} records)
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-500">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                <p className="text-gray-500">No disbursement logs match your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Disbursement ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MSISDN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversation ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.disbursementId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {log.disbursementId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          KES {log.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.msisdn}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {log.conversationId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.partner}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => viewDetailedLog(log.disbursementId)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Log Modal */}
        {showModal && selectedLog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detailed Log - {selectedLog.disbursementId}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLog.status)}`}>
                        {selectedLog.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount</label>
                      <p className="text-sm text-gray-900">KES {selectedLog.amount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Conversation ID</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-gray-900">{selectedLog.conversationId || 'N/A'}</p>
                      {selectedLog.conversationId && (
                        <button
                          onClick={() => copyToClipboard(selectedLog.conversationId)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Result Code & Description</label>
                    <p className="text-sm text-gray-900">
                      {selectedLog.resultCode || 'N/A'} - {selectedLog.resultDesc || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">MSISDN</label>
                      <p className="text-sm text-gray-900">{selectedLog.msisdn}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Partner</label>
                      <p className="text-sm text-gray-900">{selectedLog.partner}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                      <p className="text-sm text-gray-900">{selectedLog.tenantId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                      <p className="text-sm text-gray-900">{selectedLog.customerId}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client Request ID</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-gray-900">{selectedLog.clientRequestId}</p>
                      <button
                        onClick={() => copyToClipboard(selectedLog.clientRequestId)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">For Safaricom Support</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Disbursement ID:</strong> {selectedLog.disbursementId}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Conversation ID:</strong> {selectedLog.conversationId || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Status:</strong> {selectedLog.status}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Amount:</strong> KES {selectedLog.amount}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>MSISDN:</strong> {selectedLog.msisdn}
                      </p>
                      <p className="text-xs text-gray-600">
                        <strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toISOString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const logText = `Disbursement ID: ${selectedLog.disbursementId}\nConversation ID: ${selectedLog.conversationId || 'N/A'}\nStatus: ${selectedLog.status}\nAmount: KES ${selectedLog.amount}\nMSISDN: ${selectedLog.msisdn}\nTimestamp: ${new Date(selectedLog.createdAt).toISOString()}`
                      copyToClipboard(logText)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
