'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-react'

interface CallbackData {
  id: string
  conversation_id: string
  transaction_id: string
  result_code: string
  result_desc: string
  receipt_number: string
  transaction_amount: number
  created_at: string
  raw_callback_data: any
  result_parameters: any[]
  extracted_names: Array<{ key: string; value: string }>
  all_parameters: Array<{ key: string; value: string }>
}

export default function SafaricomCallbacksDebug() {
  const [callbacks, setCallbacks] = useState<CallbackData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCallbacks, setExpandedCallbacks] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchCallbacks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/safaricom-callbacks?limit=10&hours=48')
      const data = await response.json()
      
      if (data.success) {
        setCallbacks(data.callbacks)
      } else {
        console.error('Failed to fetch callbacks:', data.error)
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCallbacks()
  }, [])

  const toggleExpanded = (callbackId: string) => {
    const newExpanded = new Set(expandedCallbacks)
    if (newExpanded.has(callbackId)) {
      newExpanded.delete(callbackId)
    } else {
      newExpanded.add(callbackId)
    }
    setExpandedCallbacks(newExpanded)
  }

  const copyToClipboard = async (text: string, callbackId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(callbackId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (resultCode: string) => {
    switch (resultCode) {
      case '0': return 'text-green-600 bg-green-100'
      case '1': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-red-600 bg-red-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading Safaricom callback data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Safaricom B2C Callback Debug
        </h1>
        <p className="text-gray-600 mb-4">
          View raw M-Pesa B2C result callbacks to see what data Safaricom is sending
        </p>
        <button
          onClick={fetchCallbacks}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {callbacks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No recent callbacks found</p>
          <p className="text-gray-400 text-sm mt-2">Try making a disbursement to generate callback data</p>
        </div>
      ) : (
        <div className="space-y-6">
          {callbacks.map((callback) => (
            <div key={callback.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Transaction: {callback.transaction_id || 'N/A'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Conversation ID: {callback.conversation_id}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(callback.result_code)}`}>
                    Code: {callback.result_code}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(callback.raw_callback_data, null, 2), callback.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy raw data"
                  >
                    {copiedId === callback.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleExpanded(callback.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedCallbacks.has(callback.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Receipt Number</p>
                  <p className="font-medium">{callback.receipt_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">KSh {callback.transaction_amount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Result Description</p>
                  <p className="font-medium text-sm">{callback.result_desc}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium text-sm">{formatDateTime(callback.created_at)}</p>
                </div>
              </div>

              {/* Extracted Names */}
              {callback.extracted_names.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">🎯 Extracted Names:</h4>
                  <div className="space-y-2">
                    {callback.extracted_names.map((name, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-800">{name.key}:</span>
                        <span className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          {name.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Parameters */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">📋 All Parameters:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {callback.all_parameters.map((param, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">
                        {param.key}:
                      </span>
                      <span className="text-sm text-gray-600 truncate">
                        {param.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Data (Expandable) */}
              {expandedCallbacks.has(callback.id) && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">🔍 Raw Callback Data:</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(callback.raw_callback_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
