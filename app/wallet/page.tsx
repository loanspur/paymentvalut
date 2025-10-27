'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatDateOnly } from '../../lib/utils'
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  History, 
  RefreshCw,
  CreditCard,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  X,
  Info,
  BarChart3,
  Receipt,
  Activity
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

interface ChargeStatistics {
  today: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
  week: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
  month: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
  quarter: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
}

interface WalletTransaction {
  id: string
  wallet_id: string
  partner_id: string
  transaction_type: string
  amount: number
  currency: string
  reference?: string
  description?: string
  status: string
  created_at: string
  metadata?: any
  partner_name?: string
  partner_short_code?: string
  wallet_balance_after?: number
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
  const [topUpMethod, setTopUpMethod] = useState<'stk_push' | 'manual'>('stk_push')
  
  const { addToast } = useToast()
  
  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      addToast({
        type: 'success',
        title: 'Copied!',
        message: `${label} copied to clipboard`,
        duration: 3000
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy to clipboard',
        duration: 3000
      })
    }
  }
  const [filters, setFilters] = useState({
    transaction_type: '',
    status: '',
    start_date: '',
    end_date: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null)
  const [chargeStats, setChargeStats] = useState<ChargeStatistics | null>(null)

  useEffect(() => {
    loadWalletData()
    loadTransactions()
    loadCurrentUser()
    loadPartners()
    loadChargeStatistics()
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

  const loadChargeStatistics = async () => {
    try {
      const response = await fetch('/api/wallet/charge-statistics')
      if (response.ok) {
        const data = await response.json()
        setChargeStats(data.data)
      }
    } catch (error) {
      console.error('Failed to load charge statistics:', error)
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
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi'
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
      'Status',
      'Partner',
      'Wallet Balance After'
    ]

    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        formatDateOnly(t.created_at),
        t.transaction_type,
        t.amount,
        `"${t.reference || ''}"`,
        `"${t.description || ''}"`,
        t.status,
        `"${t.partner_name || ''}"`,
        t.wallet_balance_after || ''
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

  const handleViewTransactionDetails = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction)
    setShowTransactionDetails(true)
  }

  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return '-'
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  const clearFilters = () => {
    setFilters({
      transaction_type: '',
      status: '',
      start_date: '',
      end_date: '',
      search: ''
    })
  }

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
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
              {/* Wallet Action Buttons */}
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
                Purchase B2C Float
              </button>
              <button
                onClick={downloadCSV}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </button>
              
              {/* Balance and Refresh Controls */}
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
              >
                {showBalance ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showBalance ? 'Hide' : 'Show'} Balance
              </button>
              <button
                onClick={() => {
                  loadWalletData()
                  loadChargeStatistics()
                }}
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

      {/* Charge Statistics Cards */}
      {chargeStats && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Charge Management Statistics
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Today's Charges */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Today's Charges</p>
                    <p className="text-2xl font-bold text-blue-900">{chargeStats.today.totalTransactions}</p>
                    <p className="text-sm text-blue-700">{formatAmount(chargeStats.today.totalAmount)}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.today.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-blue-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7 Days Charges */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">7 Days Charges</p>
                    <p className="text-2xl font-bold text-green-900">{chargeStats.week.totalTransactions}</p>
                    <p className="text-sm text-green-700">{formatAmount(chargeStats.week.totalAmount)}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.week.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-green-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 30 Days Charges */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">30 Days Charges</p>
                    <p className="text-2xl font-bold text-purple-900">{chargeStats.month.totalTransactions}</p>
                    <p className="text-sm text-purple-700">{formatAmount(chargeStats.month.totalAmount)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.month.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-purple-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 90 Days Charges */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">90 Days Charges</p>
                    <p className="text-2xl font-bold text-orange-900">{chargeStats.quarter.totalTransactions}</p>
                    <p className="text-sm text-orange-700">{formatAmount(chargeStats.quarter.totalAmount)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.quarter.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-orange-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Transaction History ({pagination.total})
            </h2>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <select
                value={filters.transaction_type}
                onChange={(e) => setFilters(prev => ({ ...prev, transaction_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="top_up">Top Up</option>
                <option value="disbursement">Disbursement</option>
                <option value="b2c_float_purchase">B2C Float</option>
                <option value="charge">Charge</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <input
                type="date"
                placeholder="Start Date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance After
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.transaction_type)}
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                        {transaction.transaction_type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      transaction.transaction_type === 'top_up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'top_up' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="max-w-24 truncate" title={transaction.reference || ''}>
                      {truncateText(transaction.reference || '', 15)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div className="max-w-32 truncate" title={transaction.description || ''}>
                      {truncateText(transaction.description || '', 20)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="max-w-24 truncate" title={transaction.partner_name || ''}>
                      {transaction.partner_short_code || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.wallet_balance_after ? formatAmount(transaction.wallet_balance_after) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.created_at)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleViewTransactionDetails(transaction)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="View Details"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} transactions
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* First Page */}
                <button
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                
                {/* Previous Page */}
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          pageNum === pagination.page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                {/* Next Page */}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {/* Last Page */}
                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

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
              
              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTopUpMethod('stk_push')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      topUpMethod === 'stk_push'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 mx-auto mb-2" />
                    <div className="text-sm font-medium">STK Push</div>
                    <div className="text-xs text-gray-500">Instant payment</div>
                  </button>
                  <button
                    onClick={() => setTopUpMethod('manual')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      topUpMethod === 'manual'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-2" />
                    <div className="text-sm font-medium">Manual Payment</div>
                    <div className="text-xs text-gray-500">Paybill instructions</div>
                  </button>
                </div>
              </div>
              
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
              {/* STK Push Form Fields */}
              {topUpMethod === 'stk_push' && (
                <>
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

                  {/* STK Push Information Box */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> You will receive an STK Push notification on your phone to complete the payment.
                    </p>
                  </div>
                </>
              )}

              {/* Manual Payment Instructions */}
              {topUpMethod === 'manual' && (
                <>
                  {/* Manual Payment Instructions */}
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manual Payment Instructions
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="text-xs text-gray-500">Paybill Number</span>
                          <div className="font-mono text-sm font-semibold">880100</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard('880100', 'Paybill Number')}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="text-xs text-gray-500">Account Number</span>
                          <div className="font-mono text-sm font-semibold">
                            774451#{(() => {
                              if (currentUser?.role === 'super_admin' && selectedPartner) {
                                return selectedPartner.short_code
                              } else if (currentUser?.partner_id) {
                                const userPartner = partners.find(p => p.id === currentUser.partner_id)
                                return userPartner?.short_code || 'PARTNER'
                              }
                              return 'PARTNER'
                            })()}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(
                            `774451#${(() => {
                              if (currentUser?.role === 'super_admin' && selectedPartner) {
                                return selectedPartner.short_code
                              } else if (currentUser?.partner_id) {
                                const userPartner = partners.find(p => p.id === currentUser.partner_id)
                                return userPartner?.short_code || 'PARTNER'
                              }
                              return 'PARTNER'
                            })()}`,
                            'Account Number'
                          )}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="text-xs text-gray-500">Amount</span>
                          <div className="font-mono text-sm font-semibold">KES {topUpData.amount || 0}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(topUpData.amount.toString(), 'Amount')}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        <strong>Steps:</strong>
                      </p>
                      <ol className="text-xs text-yellow-700 mt-1 list-decimal list-inside space-y-1">
                        <li>Go to M-Pesa menu on your phone</li>
                        <li>Select "Lipa na M-Pesa"</li>
                        <li>Select "Paybill"</li>
                        <li>Enter Paybill Number: <span className="font-mono font-semibold">880100</span></li>
                        <li>Enter Account Number: <span className="font-mono font-semibold">774451#{(() => {
                          if (currentUser?.role === 'super_admin' && selectedPartner) {
                            return selectedPartner.short_code
                          } else if (currentUser?.partner_id) {
                            const userPartner = partners.find(p => p.id === currentUser.partner_id)
                            return userPartner?.short_code || 'PARTNER'
                          }
                          return 'PARTNER'
                        })()}</span></li>
                        <li>Enter Amount: <span className="font-mono font-semibold">KES {topUpData.amount || 0}</span></li>
                        <li>Enter your M-Pesa PIN</li>
                        <li>Confirm the transaction</li>
                      </ol>
                    </div>
                    
                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <strong>Auto-Credit:</strong> Your wallet will be automatically credited once NCBA confirms the payment.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTopUpModal(false)
                    setTopUpData({ amount: 0, phone_number: '' })
                    setSelectedPartner(null)
                    setTopUpMethod('stk_push')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                
                {topUpMethod === 'stk_push' ? (
                  <button
                    onClick={handleTopUp}
                    disabled={isTopUpLoading || !topUpData.phone_number}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                ) : (
                  <button
                    onClick={() => {
                      setShowTopUpModal(false)
                      setTopUpData({ amount: 0, phone_number: '' })
                      setSelectedPartner(null)
                      setTopUpMethod('stk_push')
                      addToast({
                        type: 'success',
                        title: 'Payment Instructions Ready',
                        message: 'Follow the instructions above to make your payment. Your wallet will be credited automatically.',
                        duration: 8000
                      })
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Got It!
                  </button>
                )}
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

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-600" />
                  Transaction Details
                </h3>
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transaction ID:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedTransaction.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm text-gray-900 capitalize">{selectedTransaction.transaction_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className={`text-sm font-medium ${
                        selectedTransaction.transaction_type === 'top_up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedTransaction.transaction_type === 'top_up' ? '+' : '-'}{formatAmount(selectedTransaction.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                        {selectedTransaction.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedTransaction.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Partner Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Partner Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Partner Name:</span>
                      <span className="text-sm text-gray-900">{selectedTransaction.partner_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Short Code:</span>
                      <span className="text-sm text-gray-900">{selectedTransaction.partner_short_code || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wallet Balance After:</span>
                      <span className="text-sm text-gray-900">
                        {selectedTransaction.wallet_balance_after ? formatAmount(selectedTransaction.wallet_balance_after) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Transaction Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reference:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedTransaction.reference || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Currency:</span>
                      <span className="text-sm text-gray-900">{selectedTransaction.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wallet ID:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedTransaction.wallet_id}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Description</h4>
                  <p className="text-sm text-gray-900">{selectedTransaction.description || 'No description available'}</p>
                </div>
              </div>

              {/* Metadata */}
              {selectedTransaction.metadata && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h4>
                  <div className="bg-white rounded border p-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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