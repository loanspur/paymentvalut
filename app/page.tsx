'use client'

import { useState, useEffect } from 'react'
import { 
  Send, 
  History, 
  Building2, 
  Activity,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Calendar,
  Download,
  Clock,
  CheckCircle
} from 'lucide-react'
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { AUTO_REFRESH_INTERVALS, DEFAULT_VALUES } from '../lib/constants'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    activePartners: 0,
    successRate: 0,
    todayTransactions: 0,
    todayAmount: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [partnerStats, setPartnerStats] = useState([])
  const [allPartners, setAllPartners] = useState([])
  const [chartData, setChartData] = useState({
    dailyTransactions: [],
    partnerPerformance: [],
    statusDistribution: [],
    transactionAnalytics: []
  })
  const [filters, setFilters] = useState({
    dateRange: '7d',
    partnerId: 'all',
    status: 'all'
  })
  const [userPartnerId, setUserPartnerId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Helpers to persist and restore filters (single source of truth on client)
  const saveFilters = (next) => {
    try {
      localStorage.setItem('dashboard_filters', JSON.stringify(next))
    } catch (_) {}
  }

  const restoreFilters = () => {
    try {
      const raw = localStorage.getItem('dashboard_filters')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && (parsed.partnerId || parsed.dateRange)) {
          setFilters(prev => ({
            ...prev,
            partnerId: parsed.partnerId || prev.partnerId,
            dateRange: parsed.dateRange || prev.dateRange,
            status: parsed.status || prev.status
          }))
        }
      }
    } catch (_) {}
  }

  useEffect(() => {
    // 1) Restore any saved filters first so future loads honor selection
    restoreFilters()
    // 2) Load user info (may constrain to specific partner)
    loadUserInfo()
    // 3) Load partners for the selector
    loadAllPartners()
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData()
      loadChartData()
    }, AUTO_REFRESH_INTERVALS.DASHBOARD)

    return () => clearInterval(interval)
  }, [])

  // Load dashboard data when filters change
  useEffect(() => {
    if (filters.partnerId) {
      loadDashboardData()
      loadChartData()
      // persist on every filter-driven data load to avoid switching back
      saveFilters(filters)
    }
  }, [filters.partnerId, filters.dateRange])

  // Load initial dashboard data
  useEffect(() => {
    if (filters.partnerId) {
      loadDashboardData()
    }
  }, [])

  const loadUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setUserPartnerId(data.user.partner_id)
          // If user has a specific partner, set it as the default filter
          if (data.user.partner_id && data.user.role !== 'super_admin') {
            setFilters(prev => {
              const next = { ...prev, partnerId: data.user.partner_id }
              saveFilters(next)
              return next
            })
          }
        }
      }
    } catch (error) {
      // Set default partner for Kulman Group Limited if auth fails
      const kulmanPartnerId = '550e8400-e29b-41d4-a716-446655440000'
      setUserPartnerId(kulmanPartnerId)
      setFilters(prev => {
        const next = { ...prev, partnerId: kulmanPartnerId }
        saveFilters(next)
        return next
      })
    }
  }

  const loadAllPartners = async () => {
    try {
      const response = await fetch('/api/partners')
      if (response.ok) {
        const partnersData = await response.json()
        if (partnersData.success) {
          setAllPartners(partnersData.partners || [])
        }
      }
    } catch (error) {
      // Error loading partners
    }
  }

  const loadDashboardData = async () => {
    try {
      // Fetch dashboard statistics
      const statsUrl = `/api/dashboard/stats?partnerId=${filters.partnerId}&dateRange=${filters.dateRange}`
      const statsResponse = await fetch(statsUrl)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setStats(statsData.data)
        }
      }

      // Fetch recent transactions
      const transactionsUrl = `/api/dashboard/recent-transactions?limit=10&partnerId=${filters.partnerId}`
      const transactionsResponse = await fetch(transactionsUrl)
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        if (transactionsData.success) {
          setRecentTransactions(transactionsData.data)
        }
      }

      // Fetch partner statistics
      const partnersUrl = `/api/dashboard/partner-stats?partnerId=${filters.partnerId}`
      const partnersResponse = await fetch(partnersUrl)
      if (partnersResponse.ok) {
        const partnersData = await partnersResponse.json()
        if (partnersData.success) {
          setPartnerStats(partnersData.data)
        }
      }

      // Fetch chart data
      await loadChartData()

      setLastUpdated(new Date())
      
    } catch (error) {
      // Error loading dashboard data
    } finally {
      setIsLoading(false)
    }
  }

  const loadChartData = async () => {
    try {
      // Fetch all chart data in parallel
      const [dailyRes, statusRes, partnerRes, analyticsRes] = await Promise.all([
        fetch(`/api/dashboard/chart-data?chartType=daily&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`),
        fetch(`/api/dashboard/chart-data?chartType=status&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`),
        fetch(`/api/dashboard/chart-data?chartType=partner&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`),
        fetch(`/api/dashboard/chart-data?chartType=transaction-analytics&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`)
      ])

      const [dailyData, statusData, partnerData, analyticsData] = await Promise.all([
        dailyRes.json(),
        statusRes.json(),
        partnerRes.json(),
        analyticsRes.json()
      ])

      setChartData({
        dailyTransactions: dailyData.success ? dailyData.data : [],
        partnerPerformance: partnerData.success ? partnerData.data : [],
        statusDistribution: statusData.success ? statusData.data : [],
        transactionAnalytics: analyticsData.success ? analyticsData.data : []
      })

    } catch (error) {
      // Error loading chart data
    }
  }

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const next = { ...prev, [filterType]: value }
      saveFilters(next)
      return next
    })
    // Data will be reloaded automatically by useEffect when filters change
  }

  const handleDateRangeChange = (range) => {
    setFilters(prev => {
      const next = { ...prev, dateRange: range }
      saveFilters(next)
      return next
    })
    // Data will be reloaded automatically by useEffect when filters change
  }

  const exportData = () => {
    // Export functionality
    // Exporting data
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'transactions', name: 'Transactions', icon: BarChart3 },
    { id: 'partners', name: 'Partners', icon: Building2 },
    { id: 'balances', name: 'Balances', icon: TrendingUp }
  ]

  const dateRangeOptions = [
    { value: '1d', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Filters - Mobile First */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {filters.partnerId !== 'all' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Building2 className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">{allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}</span>
                  <span className="sm:hidden">Partner</span>
                </span>
              )}
            </p>
          </div>
          
          {/* Filters - Mobile Stacked */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Date Range Filter */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Partner Filter */}
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={filters.partnerId}
                  onChange={(e) => handleFilterChange('partnerId', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={userPartnerId && userPartnerId !== 'all'}
                >
                  {userPartnerId && userPartnerId !== 'all' ? (
                    <option value={userPartnerId}>
                      {allPartners.find(p => p.id === userPartnerId)?.name || 'Your Partner'}
                    </option>
                  ) : (
                    <>
                      <option value="all">All Partners</option>
                      {allPartners.map(partner => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportData}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Mobile First Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Send className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">{stats.totalTransactions.toLocaleString()}</dd>
                  <dd className="text-xs text-gray-500">Today: {stats.todayTransactions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Amount</dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">KES {stats.totalAmount.toLocaleString()}</dd>
                  <dd className="text-xs text-gray-500">Today: KES {stats.todayAmount.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Active Partners</dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">{stats.activePartners}</dd>
                  <dd className="text-xs text-gray-500">M-Pesa configured</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">{stats.successRate}%</dd>
                  <dd className="text-xs text-gray-500">Completed transactions</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Mobile First */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 px-3 sm:px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 flex-shrink-0`}
                >
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">{tab.name}</span>
                  <span className="xs:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content - Mobile First */}
        <div className="p-4 sm:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Daily Transactions Chart */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
                  Daily Transaction Volume
                  {filters.partnerId !== 'all' && (
                    <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                      - {allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}
                    </span>
                  )}
                </h3>
                {chartData.dailyTransactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsLineChart data={chartData.dailyTransactions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'transactions' ? value : `KES ${value.toLocaleString()}`,
                          name === 'transactions' ? 'Transactions' : 'Amount'
                        ]}
                      />
                      <Line type="monotone" dataKey="transactions" stroke="#3B82F6" strokeWidth={2} />
                      <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No transaction data available</p>
                      <p className="text-sm">Data will appear here once transactions are processed</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
                    Transaction Status Distribution
                    {filters.partnerId !== 'all' && (
                      <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                        - {allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}
                      </span>
                    )}
                  </h3>
                  {chartData.statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={chartData.statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No status data available</p>
                        <p className="text-sm">Status distribution will appear here once transactions are processed</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Transactions Table */}
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Recent Transactions</h3>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{transaction.partner}</div>
                            <div className="text-xs text-gray-500 truncate">{transaction.msisdn}</div>
                          </div>
                          <div className="text-right ml-2">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">KES {transaction.amount.toLocaleString()}</div>
                            <span className={`inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-semibold rounded-full ${
                              transaction.status === 'success' ? 'bg-green-100 text-green-800' :
                              transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <History className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium">No recent transactions</p>
                        <p className="text-xs">Transactions will appear here once they are processed</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* Transaction Volume Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Transaction Volume Over Time
                  {filters.partnerId !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      - {allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}
                    </span>
                  )}
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart data={chartData.dailyTransactions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Transactions']} />
                    <Bar dataKey="transactions" fill="#3B82F6" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>

              {/* Full Transactions Table */}
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">All Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{transaction.partner}</div>
                              <div className="text-sm text-gray-500">{transaction.shortCode}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            KES {transaction.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.msisdn}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.status === 'success' ? 'bg-green-100 text-green-800' :
                              transaction.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                              transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                              transaction.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.timeAgo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'partners' && (
            <div className="space-y-6">
              {/* Partner Performance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Comparison Chart */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Performance Comparison
                      {filters.partnerId !== 'all' && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          - {allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Transactions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Success Rate</span>
                      </div>
                    </div>
                  </div>
                  {chartData.partnerPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={chartData.partnerPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'totalTransactions' ? value : `${value}%`,
                            name === 'totalTransactions' ? 'Transactions' : 'Success Rate'
                          ]}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar yAxisId="left" dataKey="totalTransactions" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="right" dataKey="successRate" fill="#10B981" radius={[2, 2, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No partner data available</p>
                        <p className="text-sm">Partner performance data will appear here</p>
                      </div>
                    </div>
                  )}
              </div>

                {/* Performance Metrics */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h3>
                  {chartData.partnerPerformance.length > 0 ? (
                    <div className="space-y-4">
                      {chartData.partnerPerformance.slice(0, 4).map((partner, index) => (
                        <div key={partner.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{partner.name}</div>
                              <div className="text-sm text-gray-500">{partner.shortCode}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {partner.totalTransactions} transactions
                            </div>
                            <div className="text-sm text-gray-500">
                              {partner.successRate}% success rate
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No metrics available</p>
                        <p className="text-sm">Performance metrics will appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Volume Over Time */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Transaction Volume Over Time</h3>
                {chartData.partnerPerformance.length > 0 && chartData.partnerPerformance[0]?.dailyPerformance?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsLineChart data={chartData.partnerPerformance[0].dailyPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'transactions' ? value : `KES ${Number(value).toLocaleString()}`,
                          name === 'transactions' ? 'Transactions' : 'Amount'
                        ]}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="transactions" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#10B981" 
                        strokeWidth={3}
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No time series data available</p>
                      <p className="text-sm">Transaction volume over time will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Partner Statistics Table */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Partner Statistics</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {filters.partnerId === 'all' 
                      ? 'Comprehensive performance metrics for all partners' 
                      : `Performance metrics for ${allPartners.find(p => p.id === filters.partnerId)?.name || 'selected partner'}`
                    }
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Transaction</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chartData.partnerPerformance.map((partner, index) => (
                        <tr key={partner.name} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3 ${
                                index === 0 ? 'bg-yellow-500' : 
                                index === 1 ? 'bg-gray-400' : 
                                index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                              }`}>
                                {index + 1}
                              </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-900">{partner.name}</div>
                              <div className="text-sm text-gray-500">{partner.shortCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{partner.totalTransactions}</div>
                            <div className="text-xs text-gray-500">
                              {partner.successfulTransactions} successful, {partner.failedTransactions} failed
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">KES {partner.totalAmount.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">KES {partner.averageTransactionValue.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-semibold text-gray-900 mr-3">{partner.successRate}%</div>
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    partner.successRate >= 95 ? 'bg-green-500' :
                                    partner.successRate >= 85 ? 'bg-green-400' :
                                    partner.successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(partner.successRate, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`text-sm font-semibold ${
                                partner.performanceScore >= 80 ? 'text-green-600' :
                                partner.performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {partner.performanceScore}
                              </div>
                              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    partner.performanceScore >= 80 ? 'bg-green-500' :
                                    partner.performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(partner.performanceScore, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'balances' && (
            <div className="space-y-6">
              {/* Transaction Analytics Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Average Transaction Amounts Over Time */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Average Transaction Amounts Over Time
                    {filters.partnerId !== 'all' && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        - {allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}
                      </span>
                    )}
                  </h3>
                  {chartData.transactionAnalytics.length > 0 && chartData.transactionAnalytics[0]?.dailyAverages?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsLineChart data={chartData.transactionAnalytics[0].dailyAverages} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value) => [`KES ${Number(value).toLocaleString()}`, 'Average Amount']}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="average" 
                          stroke="#8B5CF6" 
                          strokeWidth={3}
                          dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                        />
                  </RechartsLineChart>
                </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No transaction data available</p>
                        <p className="text-sm">Average transaction amounts will appear here</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction Frequency Statistics */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Transaction Frequency Statistics
                    {filters.partnerId !== 'all' && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        - {allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}
                      </span>
                    )}
                  </h3>
                  {chartData.transactionAnalytics.length > 0 ? (
                    <>
                      {/* Individual Partner Statistics */}
                      <div className="space-y-4">
                      {chartData.transactionAnalytics.slice(0, 4).map((partner, index) => (
                        <div key={partner.partnerId} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                                index === 0 ? 'bg-yellow-500' : 
                                index === 1 ? 'bg-gray-400' : 
                                index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{partner.partnerName}</div>
                                <div className="text-sm text-gray-500">{partner.shortCode}</div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Per Hour</div>
                              <div className="font-semibold text-gray-900">{partner.transactionsPerHour.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Per Minute</div>
                              <div className="font-semibold text-gray-900">{partner.transactionsPerMinute.toFixed(3)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Total Transactions</div>
                              <div className="font-semibold text-gray-900">{partner.totalTransactions}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Avg. Amount</div>
                              <div className="font-semibold text-gray-900">KES {partner.averageTransactionAmount.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="text-gray-500">Successful</div>
                                <div className="font-medium text-green-600">{partner.successfulTransactions}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Failed</div>
                                <div className="font-medium text-red-600">{partner.failedTransactions}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No frequency data available</p>
                        <p className="text-sm">Transaction frequency statistics will appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Peak Hours Analysis */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Peak Transaction Hours Analysis
                  {filters.partnerId !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      - {allPartners.find(p => p.id === filters.partnerId)?.name || 'Selected Partner'}
                    </span>
                  )}
                </h3>
                {chartData.transactionAnalytics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chartData.transactionAnalytics.map((partner) => (
                      <div key={partner.partnerId} className="p-4 bg-gray-50 rounded-lg">
                        <div className="mb-4">
                          <div className="font-semibold text-gray-900">{partner.partnerName}</div>
                          <div className="text-sm text-gray-500">{partner.shortCode}</div>
                        </div>
                        <div className="space-y-3">
                          {partner.peakHours.map((peak, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                              <div className="flex items-center space-x-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                                  index === 0 ? 'bg-yellow-500' : 
                                  index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                                }`}>
                                  {index + 1}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {peak.hour}:00 - {peak.hour + 1}:00
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {peak.count} transactions
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No peak hours data available</p>
                      <p className="text-sm">Peak transaction hours will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Balance Alerts */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Balance Alerts & Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="text-sm font-medium text-yellow-800">Low Balance Alert</div>
                        <div className="text-xs text-yellow-600">Finsafe Limited - Utility Account</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-yellow-800">KES 88,442</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-green-800">Balance Recovery</div>
                        <div className="text-xs text-green-600">Kulman Group Limited - Working Account</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-green-800">KES 105,851</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}