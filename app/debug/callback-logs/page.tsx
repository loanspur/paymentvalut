'use client'

import { useState, useEffect } from 'react'
import { Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface CallbackLog {
  id: string
  callback_type: 'result' | 'timeout'
  conversation_id: string
  originator_conversation_id: string
  transaction_id: string
  result_code: string
  result_desc: string
  receipt_number: string
  transaction_amount: number
  transaction_date: string
  created_at: string
  raw_callback_data: any
}

interface CallbackStats {
  result?: number
  timeout?: number
}

export default function CallbackLogsPage() {
  const [callbacks, setCallbacks] = useState<CallbackLog[]>([])
  const [stats, setStats] = useState<CallbackStats>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conversationId, setConversationId] = useState('AG_20250913_205046966cfee3a7a171')
  const [hours, setHours] = useState(24)

  const fetchCallbacks = async () => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams()
      if (conversationId) {
        params.append('conversation_id', conversationId)
      }
      params.append('hours', hours.toString())
      
      const response = await fetch(`/api/debug/callback-logs?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setCallbacks(data.callbacks)
        setStats(data.stats)
      } else {
        setError(data.error || 'Failed to fetch callback logs')
      }
    } catch (err) {
      setError('Failed to fetch callback logs')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCallbacks()
  }, [])

  const getStatusIcon = (callbackType: string, resultCode: string) => {
    if (callbackType === 'result') {
      if (resultCode === '0') {
        return <CheckCircle className="w-5 h-5 text-green-500" />
      } else {
        return <XCircle className="w-5 h-5 text-red-500" />
      }
    } else {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">M-Pesa Callback Logs</h1>
          
          {/* Search Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation ID
              </label>
              <input
                type="text"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter conversation ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours to look back
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Last 1 hour</option>
                <option value={6}>Last 6 hours</option>
                <option value={24}>Last 24 hours</option>
                <option value={168}>Last 7 days</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchCallbacks}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">Successful Results</p>
                  <p className="text-2xl font-bold text-green-900">{stats.result || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Timeouts</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.timeout || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-6 h-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Callbacks</p>
                  <p className="text-2xl font-bold text-blue-900">{callbacks.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <XCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Callback Logs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Callback Logs</h2>
          </div>
          
          {callbacks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No callbacks found for the specified criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversation ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {callbacks.map((callback) => (
                    <tr key={callback.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusIcon(callback.callback_type, callback.result_code)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          callback.callback_type === 'result' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {callback.callback_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {callback.conversation_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {callback.transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {callback.result_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {callback.transaction_amount ? `KES ${callback.transaction_amount}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {callback.receipt_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(callback.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

