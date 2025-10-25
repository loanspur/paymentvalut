'use client'

import { useState, useEffect } from 'react'
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  RefreshCw,
  Download,
  Plus,
  Eye,
  AlertCircle,
  Building2,
  CreditCard,
  History,
  CheckCircle,
  X,
  MessageSquare
} from 'lucide-react'

interface PartnerWallet {
  id: string
  partner_id: string
  partner_name: string
  current_balance: number
  currency: string
  last_topup_date?: string
  last_topup_amount?: number
  low_balance_threshold: number
  sms_notifications_enabled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  transaction_count: number
  total_transactions: number
  total_topups: number
  total_disbursements: number
}

interface WalletTransaction {
  id: string
  wallet_id: string
  partner_id: string
  partner_name: string
  transaction_type: string
  amount: number
  reference?: string
  description?: string
  status: string
  created_at: string
  metadata?: any
}

interface ManualAllocation {
  partner_id: string
  amount: number
  description: string
  transaction_type: 'credit' | 'debit'
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

export default function AdminWalletsPage() {
  const [partners, setPartners] = useState<PartnerWallet[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'allocations'>('overview')
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [allocationData, setAllocationData] = useState<ManualAllocation>({
    partner_id: '',
    amount: 0,
    description: '',
    transaction_type: 'credit'
  })
  const [filters, setFilters] = useState({
    partner_id: '',
    transaction_type: '',
    status: '',
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
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast functions
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    setToasts(prev => [...prev, newToast])
    
    // Auto remove toast after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showSuccess = (title: string, message: string) => {
    addToast({ type: 'success', title, message })
  }

  const showError = (title: string, message: string) => {
    addToast({ type: 'error', title, message })
  }

  const showWarning = (title: string, message: string) => {
    addToast({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message: string) => {
    addToast({ type: 'info', title, message })
  }

  useEffect(() => {
    loadPartnersData()
  }, [])

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions()
    }
  }, [activeTab, pagination.page, filters])

  const loadPartnersData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/wallets/partners')
      if (response.ok) {
        const data = await response.json()
        setPartners(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load partners data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters)
            .filter(([_, v]) => v !== '')
            .map(([k, v]) => [k, String(v)])
        )
      })

      const response = await fetch(`/api/admin/wallets/transactions?${params}`)
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

  const handleManualAllocation = async () => {
    if (!allocationData.partner_id || !allocationData.amount || !allocationData.description) {
      showError('Validation Error', 'Please fill in all fields')
      return
    }

    if (allocationData.amount <= 0) {
      showError('Validation Error', 'Amount must be greater than 0')
      return
    }

    try {
      const response = await fetch('/api/admin/wallets/manual-allocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(allocationData)
      })

      if (response.ok) {
        const result = await response.json()
        showSuccess('Allocation Complete', 'Manual allocation completed successfully!')
        setShowAllocationModal(false)
        setAllocationData({ partner_id: '', amount: 0, description: '', transaction_type: 'credit' })
        loadPartnersData()
        if (activeTab === 'transactions') {
          loadTransactions()
        }
      } else {
        const error = await response.json()
        showError('Allocation Failed', `Allocation failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Allocation error:', error)
      showError('Network Error', 'Allocation failed. Please check your connection and try again.')
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
      case 'topup':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'disbursement':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'b2c_float_purchase':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'charge':
        return <DollarSign className="w-4 h-4 text-orange-600" />
      case 'manual_credit':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'manual_debit':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'sms_charge':
        return <MessageSquare className="w-4 h-4 text-purple-600" />
      default:
        return <Wallet className="w-4 h-4 text-gray-600" />
    }
  }

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'topup':
        return 'Wallet Top-up'
      case 'disbursement':
        return 'M-Pesa Disbursement'
      case 'b2c_float_purchase':
        return 'B2C Float Purchase'
      case 'charge':
        return 'Transaction Charge'
      case 'manual_credit':
        return 'Manual Credit'
      case 'manual_debit':
        return 'Manual Debit'
      case 'sms_charge':
        return 'SMS Charge'
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
      'Partner',
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
        `"${t.partner_name}"`,
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
    a.download = `admin-wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const totalBalance = partners.reduce((sum, p) => sum + p.current_balance, 0)
  const totalPartners = partners.length
  const activePartners = partners.filter(p => p.is_active).length
  const lowBalancePartners = partners.filter(p => p.current_balance < p.low_balance_threshold).length

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
                <h1 className="text-2xl font-bold text-gray-900">Admin Wallet Management</h1>
                <p className="text-sm text-gray-500">Manage all partners' wallets, transactions, and allocations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAllocationModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Manual Allocation
              </button>
              <button
                onClick={loadPartnersData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Balance</p>
              <p className="text-3xl font-bold text-gray-900">{formatAmount(totalBalance)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Partners</p>
              <p className="text-3xl font-bold text-gray-900">{totalPartners}</p>
              <p className="text-sm text-gray-500">{activePartners} active</p>
            </div>
            <Users className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Balance Alerts</p>
              <p className="text-3xl font-bold text-gray-900">{lowBalancePartners}</p>
              <p className="text-sm text-gray-500">Partners need top-up</p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {totalPartners > 0 ? formatAmount(totalBalance / totalPartners) : 'KSh 0'}
              </p>
              <p className="text-sm text-gray-500">Per partner</p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Partners Overview', icon: Building2 },
              { id: 'transactions', name: 'All Transactions', icon: History },
              { id: 'allocations', name: 'Manual Allocations', icon: Plus }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Top-up
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {partners.map((partner, index) => (
                    <tr key={partner.id || partner.partner_id || `partner-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {partner.partner_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {partner.partner_id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatAmount(partner.current_balance)}
                        </div>
                        {partner.current_balance < partner.low_balance_threshold && (
                          <div className="text-xs text-orange-600 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Low balance
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          partner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {partner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {partner.last_topup_date ? (
                          <div>
                            <div>{formatAmount(partner.last_topup_amount || 0)}</div>
                            <div>{formatDate(partner.last_topup_date)}</div>
                          </div>
                        ) : (
                          'No top-ups'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Total: {partner.total_transactions}</div>
                        <div>Top-ups: {partner.total_topups}</div>
                        <div>Disbursements: {partner.total_disbursements}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPartner(partner.partner_id)
                              setAllocationData(prev => ({ ...prev, partner_id: partner.partner_id }))
                              setShowAllocationModal(true)
                            }}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Allocate
                          </button>
                          <button
                            onClick={() => {
                              setFilters(prev => ({ ...prev, partner_id: partner.partner_id }))
                              setActiveTab('transactions')
                            }}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <>
              {/* Filters */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner</label>
                  <select
                    value={filters.partner_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, partner_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Partners</option>
                    {partners.map((partner, index) => (
                      <option key={partner.partner_id || `partner-option-${index}`} value={partner.partner_id}>{partner.partner_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={filters.transaction_type}
                    onChange={(e) => setFilters(prev => ({ ...prev, transaction_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="topup">Top Up</option>
                    <option value="disbursement">Disbursement</option>
                    <option value="b2c_float_purchase">B2C Float</option>
                    <option value="charge">Charge</option>
                    <option value="manual_credit">Manual Credit</option>
                    <option value="manual_debit">Manual Debit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={downloadCSV}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
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
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction, index) => (
                      <tr key={transaction.id || `transaction-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.partner_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTransactionIcon(transaction.transaction_type)}
                            <span className="ml-2 text-sm font-medium text-gray-900">
                              {formatTransactionType(transaction.transaction_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{formatAmount(transaction.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.reference || '-'}
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
                  <p className="text-gray-500">No transactions match your current filters.</p>
                </div>
              )}
            </>
          )}

          {/* Manual Allocations Tab */}
          {activeTab === 'allocations' && (
            <div className="text-center py-12">
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Manual Allocations</h3>
              <p className="text-gray-500 mb-4">Perform manual credit or debit operations on partner wallets.</p>
              <button
                onClick={() => setShowAllocationModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center mx-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Manual Allocation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual Allocation Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Wallet Allocation</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner
                </label>
                <select
                  value={allocationData.partner_id}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, partner_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Partner</option>
                  {partners.map((partner, index) => (
                    <option key={partner.partner_id || `partner-modal-${index}`} value={partner.partner_id}>{partner.partner_name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <select
                  value={allocationData.transaction_type}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, transaction_type: e.target.value as 'credit' | 'debit' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="credit">Credit (Add Money)</option>
                  <option value="debit">Debit (Remove Money)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  value={allocationData.amount}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={allocationData.description}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description for this allocation"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAllocationModal(false)
                    setAllocationData({ partner_id: '', amount: 0, description: '', transaction_type: 'credit' })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualAllocation}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Process Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden
              transform transition-all duration-300 ease-in-out
              ${toast.type === 'success' ? 'border-l-4 border-green-500' : ''}
              ${toast.type === 'error' ? 'border-l-4 border-red-500' : ''}
              ${toast.type === 'warning' ? 'border-l-4 border-yellow-500' : ''}
              ${toast.type === 'info' ? 'border-l-4 border-blue-500' : ''}
            `}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {toast.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                  {toast.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {toast.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => removeToast(toast.id)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
