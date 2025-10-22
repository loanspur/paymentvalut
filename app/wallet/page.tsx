'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  History, 
  RefreshCw,
  DollarSign,
  Smartphone,
  Shield
} from 'lucide-react'

interface WalletData {
  wallet: {
    id: string
    partnerId: string
    currentBalance: number
    currency: string
    lastTopupDate?: string
    lastTopupAmount?: number
    lowBalanceThreshold: number
    smsNotificationsEnabled: boolean
    isLowBalance: boolean
  }
  b2cFloat: {
    currentFloatBalance: number
    lastPurchaseDate?: string
    lastPurchaseAmount?: number
    totalPurchased: number
    totalUsed: number
  } | null
}

interface Transaction {
  id: string
  transactionType: string
  amount: number
  reference: string
  description: string
  status: string
  createdAt: string
}

export default function WalletPage() {
  const { user, isAuthenticated } = useAuth()
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [showFloatModal, setShowFloatModal] = useState(false)

  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/wallet/balance', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setWalletData(data)
      } else {
        setError('Failed to fetch wallet data')
      }
    } catch (error) {
      setError('Network error while fetching wallet data')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch transaction history
  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/wallet/transactions?limit=10', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWalletData()
      fetchTransactions()
    }
  }, [isAuthenticated, user])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
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
        return <Plus className="h-4 w-4 text-green-600" />
      case 'disbursement':
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case 'b2c_float_purchase':
        return <DollarSign className="h-4 w-4 text-purple-600" />
      case 'charge':
        return <TrendingUp className="h-4 w-4 text-orange-600" />
      default:
        return <Wallet className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access your wallet.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading wallet data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
          <p className="mt-2 text-gray-600">Manage your wallet balance and transaction history</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Wallet Balance */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Wallet Balance</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {walletData ? formatCurrency(walletData.wallet.currentBalance) : 'KES 0.00'}
                </p>
                {walletData?.wallet.isLowBalance && (
                  <p className="text-sm text-red-600 mt-1">⚠️ Low balance alert</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setShowTopupModal(true)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Top Up Wallet
              </button>
            </div>
          </div>

          {/* B2C Float Balance */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">B2C Float</h3>
                <p className="text-3xl font-bold text-green-600">
                  {walletData?.b2cFloat ? formatCurrency(walletData.b2cFloat.currentFloatBalance) : 'KES 0.00'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Total Used: {walletData?.b2cFloat ? formatCurrency(walletData.b2cFloat.totalUsed) : 'KES 0.00'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setShowFloatModal(true)}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                <Smartphone className="h-4 w-4 inline mr-2" />
                Purchase Float
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Quick Stats</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Last Top-up: {walletData?.wallet.lastTopupDate 
                      ? formatDate(walletData.wallet.lastTopupDate)
                      : 'Never'
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    Threshold: {walletData ? formatCurrency(walletData.wallet.lowBalanceThreshold) : 'KES 0.00'}
                  </p>
                  <p className="text-sm text-gray-600">
                    SMS Alerts: {walletData?.wallet.smsNotificationsEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
              <button
                onClick={fetchTransactions}
                className="text-blue-600 hover:text-blue-700 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600">Your transaction history will appear here.</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.transactionType)}
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {transaction.reference} • {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modals */}
        {showTopupModal && (
          <TopupModal 
            onClose={() => setShowTopupModal(false)}
            onSuccess={() => {
              setShowTopupModal(false)
              fetchWalletData()
              fetchTransactions()
            }}
          />
        )}

        {showFloatModal && (
          <FloatPurchaseModal 
            onClose={() => setShowFloatModal(false)}
            onSuccess={() => {
              setShowFloatModal(false)
              fetchWalletData()
              fetchTransactions()
            }}
          />
        )}
      </div>
    </div>
  )
}

// Top-up Modal Component
function TopupModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    amount: '',
    phoneNumber: '',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/wallet/topup/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          phone_number: formData.phoneNumber,
          description: formData.description || 'Wallet top-up via STK Push'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('STK Push initiated successfully! Check your phone to complete the payment.')
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        setError(data.error || 'Failed to initiate STK Push')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Up Wallet</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
              <input
                type="number"
                min="1"
                max="1000000"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="254712345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Wallet top-up"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Processing...' : 'Initiate STK Push'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Float Purchase Modal Component
function FloatPurchaseModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    floatAmount: '',
    transferFee: '10',
    processingFee: '5',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpReference, setOtpReference] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showOtpStep, setShowOtpStep] = useState(false)

  const handleGenerateOtp = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          phone_number: '254712345678', // This should come from user profile
          email_address: 'admin@example.com', // This should come from user profile
          purpose: 'float_purchase',
          amount: parseFloat(formData.floatAmount)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setOtpReference(data.reference)
        setShowOtpStep(true)
        setSuccess('OTP sent to your phone and email. Please enter the code below.')
      } else {
        setError(data.error || 'Failed to generate OTP')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurchaseFloat = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/wallet/float/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          float_amount: parseFloat(formData.floatAmount),
          transfer_fee: parseFloat(formData.transferFee),
          processing_fee: parseFloat(formData.processingFee),
          otp_reference: otpReference,
          otp_code: otpCode,
          description: formData.description || 'B2C float purchase'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('B2C float purchased successfully!')
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        setError(data.error || 'Failed to purchase B2C float')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const totalAmount = parseFloat(formData.floatAmount) + parseFloat(formData.transferFee) + parseFloat(formData.processingFee)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase B2C Float</h3>
          
          {!showOtpStep ? (
            <form onSubmit={(e) => { e.preventDefault(); handleGenerateOtp(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Float Amount (KES)</label>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  required
                  value={formData.floatAmount}
                  onChange={(e) => setFormData({...formData, floatAmount: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter float amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Transfer Fee (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.transferFee}
                  onChange={(e) => setFormData({...formData, transferFee: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Processing Fee (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.processingFee}
                  onChange={(e) => setFormData({...formData, processingFee: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Total Amount:</strong> KES {totalAmount.toFixed(2)}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Generating OTP...' : 'Generate OTP'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePurchaseFloat} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Enter OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="123456"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your phone and email</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOtpStep(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Purchase Float'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

