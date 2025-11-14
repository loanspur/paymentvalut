'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Upload, 
  Download, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Filter,
  X,
  Eye,
  ExternalLink,
  Copy,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { useToast } from '../../../components/ToastSimple'
import { LoadingButton } from '../../../components/LoadingButton'
import Papa from 'papaparse'

interface Transaction {
  id: string
  conversation_id: string | null
  originator_conversation_id: string | null
  client_request_id: string
  customer_name: string | null
  customer_id: string
  msisdn: string
  amount: number
  status: string
  result_code: string | null
  result_desc: string | null
  transaction_id: string | null
  transaction_receipt: string | null
  partner_id: string
  created_at: string
  updated_at: string
  partners: {
    id: string
    name: string
    short_code: string
  } | null
}

interface QueryResult {
  originator_conversation_id: string
  success: boolean
  conversation_id?: string
  response_code?: string
  response_description?: string
  error?: string
}

export default function MissingCallbacksPage() {
  const { addToast } = useToast()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [querying, setQuerying] = useState<string | null>(null)
  const [queryResults, setQueryResults] = useState<Record<string, QueryResult>>({})
  const [sendingWebhook, setSendingWebhook] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    partner_id: '',
    status: '',
    search: ''
  })
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [csvData, setCsvData] = useState<Array<{ originator_conversation_id: string }>>([])
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [filters])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.partner_id) params.append('partner_id', filters.partner_id)
      if (filters.status) params.append('status', filters.status)
      params.append('limit', '100')

      const response = await fetch(`/api/admin/missing-callbacks?${params.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data.data || [])
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Load Transactions',
          message: 'An error occurred while loading transactions without callbacks.'
        })
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to load transactions. Please check your connection.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          addToast({
            type: 'error',
            title: 'CSV Parsing Error',
            message: results.errors[0].message
          })
          setUploading(false)
          return
        }

        const data = results.data as any[]
        const originatorIds = data
          .map(row => {
            // Try different column names
            return row.originator_conversation_id || 
                   row.originator_conversation_id || 
                   row['Originator Conversation ID'] ||
                   row['originator_conversation_id'] ||
                   row['ORIGINATOR_CONVERSATION_ID'] ||
                   Object.values(row)[0] // First column as fallback
          })
          .filter(id => id && typeof id === 'string' && id.trim().length > 0)
          .map(id => ({ originator_conversation_id: String(id).trim() }))

        if (originatorIds.length === 0) {
          addToast({
            type: 'error',
            title: 'Invalid CSV',
            message: 'No valid originator_conversation_id found in CSV. Please check column names.'
          })
          setUploading(false)
          return
        }

        setCsvData(originatorIds)
        addToast({
          type: 'success',
          title: 'CSV Uploaded',
          message: `Successfully loaded ${originatorIds.length} originator conversation IDs from CSV`
        })
        setUploading(false)
      },
      error: (error) => {
        addToast({
          type: 'error',
          title: 'CSV Upload Failed',
          message: error.message
        })
        setUploading(false)
      }
    })
  }

  const handleQueryTransaction = async (originatorConversationId: string) => {
    if (!originatorConversationId) {
      addToast({
        type: 'error',
        title: 'Invalid ID',
        message: 'Originator Conversation ID is required'
      })
      return
    }

    setQuerying(originatorConversationId)
    
    try {
      const response = await fetch('/api/mpesa/query-transaction-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          originator_conversation_id: originatorConversationId
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setQueryResults(prev => ({
          ...prev,
          [originatorConversationId]: {
            originator_conversation_id: originatorConversationId,
            success: true,
            conversation_id: result.query.conversation_id,
            response_code: result.query.response_code,
            response_description: result.query.response_description
          }
        }))

        addToast({
          type: 'success',
          title: 'Query Initiated',
          message: `Transaction status query sent to Safaricom. Results will arrive via callback.`
        })
      } else {
        setQueryResults(prev => ({
          ...prev,
          [originatorConversationId]: {
            originator_conversation_id: originatorConversationId,
            success: false,
            error: result.error || result.message || 'Unknown error'
          }
        }))

        addToast({
          type: 'error',
          title: 'Query Failed',
          message: result.error || result.message || 'Failed to query transaction status'
        })
      }
    } catch (error) {
      console.error('Error querying transaction:', error)
      setQueryResults(prev => ({
        ...prev,
        [originatorConversationId]: {
          originator_conversation_id: originatorConversationId,
          success: false,
          error: error instanceof Error ? error.message : 'Network error'
        }
      }))

      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to query transaction status. Please check your connection.'
      })
    } finally {
      setQuerying(null)
    }
  }

  const handleBatchQuery = async () => {
    const idsToQuery = csvData.length > 0 
      ? csvData.map(row => row.originator_conversation_id)
      : Array.from(selectedTransactions).map(id => {
          const transaction = transactions.find(t => t.id === id)
          return transaction?.originator_conversation_id
        }).filter(Boolean) as string[]

    if (idsToQuery.length === 0) {
      addToast({
        type: 'error',
        title: 'No IDs Selected',
        message: 'Please upload a CSV or select transactions to query'
      })
      return
    }

    setQuerying('batch')
    
    try {
      const response = await fetch('/api/mpesa/query-transaction-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          originator_conversation_ids: idsToQuery
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Store results
        result.results.forEach((res: QueryResult) => {
          setQueryResults(prev => ({
            ...prev,
            [res.originator_conversation_id]: res
          }))
        })

        addToast({
          type: 'success',
          title: 'Batch Query Initiated',
          message: `Initiated queries for ${result.results.length} transactions. Results will arrive via callback.`
        })
      } else {
        addToast({
          type: 'error',
          title: 'Batch Query Failed',
          message: result.error || result.message || 'Failed to query transactions'
        })
      }
    } catch (error) {
      console.error('Error in batch query:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to query transactions. Please check your connection.'
      })
    } finally {
      setQuerying(null)
    }
  }

  const handleSendWebhook = async (transaction: Transaction) => {
    setSendingWebhook(transaction.id)
    
    try {
      const response = await fetch('/api/admin/missing-callbacks/send-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          transaction_id: transaction.id,
          conversation_id: transaction.conversation_id,
          originator_conversation_id: transaction.originator_conversation_id
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        addToast({
          type: 'success',
          title: 'Webhook Sent',
          message: `Transaction status sent to USSD team successfully`
        })
      } else {
        addToast({
          type: 'error',
          title: 'Webhook Failed',
          message: result.error || 'Failed to send webhook to USSD team'
        })
      }
    } catch (error) {
      console.error('Error sending webhook:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to send webhook. Please check your connection.'
      })
    } finally {
      setSendingWebhook(null)
    }
  }

  const toggleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)))
    }
  }

  const downloadCSVTemplate = () => {
    const headers = ['originator_conversation_id']
    const sampleData = [
      ['012e-4077-9e75-d1e27265b99098043'],
      ['f2b1-40c1-a220-7619c6f034df793486'],
      ['e694-42b9-941a-9e925d007ac734845']
    ]

    let csvContent = headers.join(',') + '\n'
    sampleData.forEach(row => {
      csvContent += row.join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'originator_conversation_ids_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800'
      case 'queued':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        transaction.conversation_id?.toLowerCase().includes(searchLower) ||
        transaction.originator_conversation_id?.toLowerCase().includes(searchLower) ||
        transaction.client_request_id?.toLowerCase().includes(searchLower) ||
        transaction.customer_name?.toLowerCase().includes(searchLower) ||
        transaction.msisdn?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Missing Callbacks Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Query Safaricom for missing M-Pesa callbacks and send results to USSD team
          </p>
        </div>
        <button
          onClick={loadTransactions}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 mb-6" role="alert">
        <div className="flex">
          <div className="py-1"><Info className="h-5 w-5 text-blue-600 mr-3" /></div>
          <div>
            <p className="font-bold">How This Works</p>
            <p className="text-sm mt-1">
              1. View transactions without callbacks below, or upload a CSV with originator_conversation_ids<br/>
              2. Query Safaricom M-Pesa API to get transaction status<br/>
              3. Results will arrive via callback (check back in a few minutes)<br/>
              4. Send webhook to USSD team with the transaction status
            </p>
          </div>
        </div>
      </div>

      {/* CSV Upload Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV with Originator Conversation IDs</h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
          />
          {csvData.length > 0 && (
            <span className="text-sm text-gray-600">
              {csvData.length} IDs loaded
            </span>
          )}
          <button
            onClick={downloadCSVTemplate}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" /> Template
          </button>
          {csvData.length > 0 && (
            <LoadingButton
              onClick={handleBatchQuery}
              loading={querying === 'batch'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" /> Query All ({csvData.length})
            </LoadingButton>
          )}
        </div>
        {uploading && (
          <div className="mt-4 flex items-center text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading and parsing CSV...
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="accepted">Accepted</option>
              <option value="queued">Queued</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ partner_id: '', status: '', search: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Transactions Without Callbacks ({filteredTransactions.length})
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedTransactions.size === filteredTransactions.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedTransactions.size > 0 && (
              <LoadingButton
                onClick={handleBatchQuery}
                loading={querying === 'batch'}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" /> Query Selected ({selectedTransactions.size})
              </LoadingButton>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="ml-4 text-gray-600">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Transactions Found</h3>
            <p className="text-gray-500">All transactions have callbacks, or no transactions match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={selectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversation IDs
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const queryResult = transaction.originator_conversation_id 
                    ? queryResults[transaction.originator_conversation_id] 
                    : null
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(transaction.id)}
                          onChange={() => toggleSelectTransaction(transaction.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.customer_name || transaction.customer_id}
                        </div>
                        <div className="text-sm text-gray-500">{transaction.msisdn}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {transaction.conversation_id && (
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs">{transaction.conversation_id}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(transaction.conversation_id!)
                                  addToast({ type: 'success', title: 'Copied', message: 'Conversation ID copied to clipboard' })
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {transaction.originator_conversation_id && (
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="font-mono text-xs text-blue-600">{transaction.originator_conversation_id}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(transaction.originator_conversation_id!)
                                  addToast({ type: 'success', title: 'Copied', message: 'Originator Conversation ID copied to clipboard' })
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        KES {transaction.amount?.toLocaleString() || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                        {queryResult && (
                          <div className="mt-1">
                            {queryResult.success ? (
                              <span className="text-xs text-green-600 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" /> Query sent
                              </span>
                            ) : (
                              <span className="text-xs text-red-600 flex items-center">
                                <XCircle className="w-3 h-3 mr-1" /> {queryResult.error}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {transaction.originator_conversation_id && (
                            <button
                              onClick={() => handleQueryTransaction(transaction.originator_conversation_id!)}
                              disabled={querying === transaction.originator_conversation_id}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                              title="Query transaction status from Safaricom"
                            >
                              {querying === transaction.originator_conversation_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Search className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWebhook(transaction)}
                            disabled={sendingWebhook === transaction.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                            title="Send webhook to USSD team"
                          >
                            {sendingWebhook === transaction.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Query Results Summary */}
      {Object.keys(queryResults).length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Query Results</h2>
            <button
              onClick={() => setShowResults(!showResults)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showResults ? 'Hide' : 'Show'} Details
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">Successful Queries</p>
              <p className="text-2xl font-semibold text-green-900">
                {Object.values(queryResults).filter(r => r.success).length}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-700">Failed Queries</p>
              <p className="text-2xl font-semibold text-red-900">
                {Object.values(queryResults).filter(r => !r.success).length}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">Total Queries</p>
              <p className="text-2xl font-semibold text-blue-900">
                {Object.keys(queryResults).length}
              </p>
            </div>
          </div>
          {showResults && (
            <div className="mt-4 space-y-2">
              {Object.values(queryResults).map((result, index) => (
                <div key={index} className={`p-3 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{result.originator_conversation_id}</span>
                    {result.success ? (
                      <span className="text-sm text-green-700">✓ Query sent</span>
                    ) : (
                      <span className="text-sm text-red-700">✗ {result.error}</span>
                    )}
                  </div>
                  {result.success && result.response_code && (
                    <div className="mt-2 text-xs text-gray-600">
                      Response: {result.response_code} - {result.response_description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

