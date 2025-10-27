'use client'

import { useState, useEffect } from 'react'
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  History, 
  RefreshCw,
  CreditCard,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import { useToast } from '../../components/ToastSimple'

interface WalletData {
  id: string
  partner_id: string
  current_balance: number
  currency: string
  last_topup_date?: string
  last_topup_amount?: number
  low_balance_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface WalletTransaction {
  id: string
  wallet_id: string
  transaction_type: string
  amount: number
  currency: string
  reference?: string
  description?: string
  status: string
  created_at: string
  metadata?: any
}

interface TopUpRequest {
  amount: number
  phone_number: string
  partner_id?: string
}

interface Partner {
  id: string
  name: string
  short_code: string
  is_active: boolean
}

interface User {
  id: string
  email: string
  role: string
  partner_id?: string
  first_name?: string
  last_name?: string
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [showFloatModal, setShowFloatModal] = useState(false)
  const [topUpData, setTopUpData] = useState<TopUpRequest>({ amount: 0, phone_number: '' })
  const [floatAmount, setFloatAmount] = useState(0)
  const [showBalance, setShowBalance] = useState(true)
  const [partners, setPartners] = useState<Partner[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [isTopUpLoading, setIsTopUpLoading] = useState(false)
  
  const { addToast } = useToast()
  const [filters, setFilters] = useState({
    transaction_type: '',
    status: '',
    start_date: '',
    end_date: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    loadWalletData()
    loadTransactions()
    loadCurrentUser()
    loadPartners()
  }, [pagination.page, filters])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/wallet')
      if (response.ok) {
        const data = await response.json()
        setWallet(data.data)
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
      }
    } catch (error) {
      console.error('Failed to load current user:', error)
    }
  }

  const loadPartners = async () => {
    try {
      const response = await fetch('/api/partners')
      if (response.ok) {
        const data = await response.json()
        setPartners(data.partners || [])
      }
    } catch (error) {
      console.error('Failed to load partners:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      })

      const response = await fetch(`/api/wallet/transactions?${params}`)
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
    }
  }

  const handleTopUp = async () => {
    if (!topUpData.amount || !topUpData.phone_number) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields',
        duration: 5000
      })
      return
    }

    // For super admin, require partner selection
    if (currentUser?.role === 'super_admin' && !topUpData.partner_id) {
      addToast({
        type: 'error',
        title: 'Partner Required',
        message: 'Please select a partner for the top-up',
        duration: 5000
      })
      return
    }

    setIsTopUpLoading(true)

    try {
      const response = await fetch('/api/wallet/topup/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(topUpData)
      })

      if (response.ok) {
        const result = await response.json()
        addToast({
          type: 'success',
          title: 'STK Push Initiated',
          message: 'Check your phone to complete the payment',
          duration: 8000
        })
        setShowTopUpModal(false)
        setTopUpData({ amount: 0, phone_number: '' })
        setSelectedPartner(null)
        loadWalletData()
      } else {
        const error = await response.json()
        addToast({
          type: 'error',
          title: 'Top-up Failed',
          message: error.error || 'An error occurred during top-up',
          duration: 8000
        })
      }
    } catch (error) {
      console.error('Top-up error:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Top-up failed. Please check your connection and try again.',
        duration: 8000
      })
    } finally {
      setIsTopUpLoading(false)
    }
  }

  const handleFloatPurchase = async () => {
    if (!floatAmount) {
      alert('Please enter float amount')
      return
    }

    try {
      const response = await fetch('/api/wallet/float/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: floatAmount })
      })

      if (response.ok) {
        const result = await response.json()
        alert('Float purchase initiated! You will receive an OTP for confirmation.')
        setShowFloatModal(false)
        setFloatAmount(0)
        loadWalletData()
      } else {
        const error = await response.json()
        alert(`Float purchase failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Float purchase error:', error)
      alert('Float purchase failed. Please try again.')
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'top_up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'disbursement':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'b2c_float_purchase':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'charge':
        return <DollarSign className="w-4 h-4 text-orange-600" />
      default:
        return <Wallet className="w-4 h-4 text-gray-600" />
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

  const downloadCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Amount',
      'Reference',
      'Description',
      'Status'
    ]

    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        new Date(t.created_at).toLocaleDateString(),
        t.transaction_type,
        t.amount,
        `"${t.reference || ''}"`,
        `"${t.description || ''}"`,
        t.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading wallet data...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
                <p className="text-sm text-gray-500">Manage your wallet balance and transactions</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
              >
                {showBalance ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showBalance ? 'Hide' : 'Show'} Balance
              </button>
              <button
                onClick={loadWalletData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Balance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {showBalance ? formatAmount(wallet?.current_balance || 0) : '••••••'}
              </p>
            </div>
            <Wallet className="h-12 w-12 text-blue-600" />
          </div>
          {wallet && wallet.current_balance < wallet.low_balance_threshold && (
            <div className="mt-4 flex items-center text-orange-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Low balance alert</span>
            </div>
          )}
        </div>

        {/* Last Top-up */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Last Top-up</p>
              <p className="text-2xl font-bold text-gray-900">
                {wallet?.last_topup_amount ? formatAmount(wallet.last_topup_amount) : 'None'}
              </p>
              <p className="text-sm text-gray-500">
                {wallet?.last_topup_date ? formatDate(wallet.last_topup_date) : 'No top-ups yet'}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600" />
          </div>
        </div>

        {/* Low Balance Threshold */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Balance Alert</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatAmount(wallet?.low_balance_threshold || 1000)}
              </p>
              <p className="text-sm text-gray-500">Alert threshold</p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Wallet Actions</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowTopUpModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Top Up Wallet
            </button>
            <button
              onClick={() => setShowFloatModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Purchase B2C Float
            </button>
            <button
              onClick={downloadCSV}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              <Download className="w-5 h-5 mr-2" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Transaction History ({pagination.total})
            </h2>
            <div className="flex items-center space-x-2">
              <select
                value={filters.transaction_type}
                onChange={(e) => setFilters(prev => ({ ...prev, transaction_type: e.target.value }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">All Types</option>
                <option value="top_up">Top Up</option>
                <option value="disbursement">Disbursement</option>
                <option value="b2c_float_purchase">B2C Float</option>
                <option value="charge">Charge</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.transaction_type)}
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                        {transaction.transaction_type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      transaction.transaction_type === 'top_up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'top_up' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.reference || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-4">Your transaction history will appear here when you make your first transaction.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowTopUpModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Top Up Wallet
              </button>
              <button
                onClick={() => setShowFloatModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Purchase Float
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top-up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Up Wallet</h3>
              
              {/* Partner Selection for Super Admin */}
              {currentUser?.role === 'super_admin' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Partner <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={topUpData.partner_id || ''}
                    onChange={(e) => {
                      const partnerId = e.target.value
                      const partner = partners.find(p => p.id === partnerId)
                      setTopUpData(prev => ({ ...prev, partner_id: partnerId }))
                      setSelectedPartner(partner || null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a partner</option>
                    {partners.filter(p => p.is_active).map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.short_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Partner Details Display */}
              {(currentUser?.role !== 'super_admin' && currentUser?.partner_id) && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Partner Details</h4>
                  {(() => {
                    const userPartner = partners.find(p => p.id === currentUser.partner_id)
                    return userPartner ? (
                      <div className="text-sm text-blue-800">
                        <p><strong>Name:</strong> {userPartner.name}</p>
                        <p><strong>Short Code:</strong> {userPartner.short_code}</p>
                        <p><strong>Status:</strong> {userPartner.is_active ? '✅ Active' : '❌ Inactive'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">Partner not found</p>
                    )
                  })()}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={topUpData.amount}
                  onChange={(e) => setTopUpData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="1"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={topUpData.phone_number}
                  onChange={(e) => setTopUpData(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="254XXXXXXXXX"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Format: 254XXXXXXXXX (e.g., 254700000000)</p>
              </div>

              {/* Information Box */}
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> You will receive an STK Push notification on your phone to complete the payment.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTopUpModal(false)
                    setTopUpData({ amount: 0, phone_number: '' })
                    setSelectedPartner(null)
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopUp}
                  disabled={isTopUpLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isTopUpLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Initiating STK Push...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 mr-2" />
                      Initiate STK Push
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Float Purchase Modal */}
      {showFloatModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase B2C Float</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Float Amount (KES)
                </label>
                <input
                  type="number"
                  value={floatAmount}
                  onChange={(e) => setFloatAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter float amount"
                  min="1"
                />
              </div>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You will receive an OTP via SMS and email to confirm this transaction.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowFloatModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFloatPurchase}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Purchase Float
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}