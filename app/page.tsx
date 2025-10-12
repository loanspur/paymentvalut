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
  Download
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
  const [chartData, setChartData] = useState({
    dailyTransactions: [],
    partnerPerformance: [],
    statusDistribution: [],
    balanceTrends: []
  })
  const [filters, setFilters] = useState({
    dateRange: '7d',
    partnerId: 'all',
    status: 'all'
  })
  const [userPartnerId, setUserPartnerId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    loadUserInfo()
    loadDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData()
    }, AUTO_REFRESH_INTERVALS.DASHBOARD)

    return () => clearInterval(interval)
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
            setFilters(prev => ({
              ...prev,
              partnerId: data.user.partner_id
            }))
          }
        }
      }
    } catch (error) {
      // Set default partner for Kulman Group Limited if auth fails
      const kulmanPartnerId = '550e8400-e29b-41d4-a716-446655440000'
      setUserPartnerId(kulmanPartnerId)
      setFilters(prev => ({
        ...prev,
        partnerId: kulmanPartnerId
      }))
    }
  }

  const loadDashboardData = async () => {
    try {
      // Fetch dashboard statistics
      const statsResponse = await fetch('/api/dashboard/stats-simple')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setStats(statsData.data)
        }
      }

      // Fetch recent transactions
      const transactionsResponse = await fetch('/api/dashboard/recent-transactions-simple?limit=10')
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        if (transactionsData.success) {
          setRecentTransactions(transactionsData.data)
        }
      }

      // Fetch partner statistics
      const partnersResponse = await fetch('/api/dashboard/partner-stats-simple')
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
      const [dailyRes, statusRes, partnerRes, balanceRes] = await Promise.all([
        fetch(`/api/dashboard/chart-data?chartType=daily&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`),
        fetch(`/api/dashboard/chart-data?chartType=status&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`),
        fetch(`/api/dashboard/chart-data?chartType=partner&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`),
        fetch(`/api/dashboard/chart-data?chartType=balance&dateRange=${filters.dateRange}&partnerId=${filters.partnerId}`)
      ])

      const [dailyData, statusData, partnerData, balanceData] = await Promise.all([
        dailyRes.json(),
        statusRes.json(),
        partnerRes.json(),
        balanceRes.json()
      ])

      setChartData({
        dailyTransactions: dailyData.success ? dailyData.data : [],
        partnerPerformance: partnerData.success ? partnerData.data : [],
        statusDistribution: statusData.success ? statusData.data : [],
        balanceTrends: balanceData.success ? balanceData.data : []
      })

    } catch (error) {
      // Error loading chart data
    }
  }

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
    // Reload chart data when filters change
    setTimeout(() => loadChartData(), 100)
  }

  const handleDateRangeChange = (range) => {
    setFilters(prev => ({
      ...prev,
      dateRange: range
    }))
    // Reload chart data when date range changes
    setTimeout(() => loadChartData(), 100)
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
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-4">
            {/* Date Range Filter */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={filters.dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <Building2 className="h-4 w-4 text-gray-400" />
              <select
                value={filters.partnerId}
                onChange={(e) => handleFilterChange('partnerId', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={userPartnerId && userPartnerId !== 'all'}
              >
                {userPartnerId && userPartnerId !== 'all' ? (
                  <option value={userPartnerId}>
                    {partnerStats.find(p => p.id === userPartnerId)?.name || 'Your Partner'}
                  </option>
                ) : (
                  <>
                    <option value="all">All Partners</option>
                    {partnerStats.map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={exportData}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalTransactions.toLocaleString()}</dd>
                  <dd className="text-xs text-gray-500">Today: {stats.todayTransactions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Amount</dt>
                  <dd className="text-lg font-medium text-gray-900">KES {stats.totalAmount.toLocaleString()}</dd>
                  <dd className="text-xs text-gray-500">Today: KES {stats.todayAmount.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Partners</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activePartners}</dd>
                  <dd className="text-xs text-gray-500">M-Pesa configured</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.successRate}%</dd>
                  <dd className="text-xs text-gray-500">Completed transactions</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
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
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Daily Transactions Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Transaction Volume</h3>
                {chartData.dailyTransactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Status Distribution</h3>
                  {chartData.statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
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
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{transaction.partner}</div>
                            <div className="text-xs text-gray-500">{transaction.msisdn}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">KES {transaction.amount.toLocaleString()}</div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Volume Over Time</h3>
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
              {/* Partner Performance Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Partner Performance</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart data={chartData.partnerPerformance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(value) => [value, 'Transactions']} />
                    <Bar dataKey="transactions" fill="#8B5CF6" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>

              {/* Partner Stats Table */}
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Partner Statistics</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Today</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {partnerStats.map((partner) => (
                        <tr key={partner.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                              <div className="text-sm text-gray-500">{partner.shortCode}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {partner.totalTransactions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            KES {partner.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {partner.todayTransactions} ({partner.todayAmount > 0 ? `KES ${partner.todayAmount.toLocaleString()}` : 'No activity'})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              partner.successRate >= 95 ? 'bg-green-100 text-green-800' :
                              partner.successRate >= 80 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {partner.successRate}%
                            </span>
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
              {/* Balance Trends Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Balance Trends</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLineChart data={chartData.balanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`KES ${value.toLocaleString()}`, 'Balance']} />
                    <Legend />
                    <Line type="monotone" dataKey="utility" stroke="#3B82F6" strokeWidth={2} name="Utility Account" />
                    <Line type="monotone" dataKey="working" stroke="#10B981" strokeWidth={2} name="Working Account" />
                    <Line type="monotone" dataKey="charges" stroke="#F59E0B" strokeWidth={2} name="Charges Account" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>

              {/* Balance Alerts */}
              <div className="bg-white rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Balance Alerts</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="text-sm font-medium text-yellow-800">Low Balance Alert</div>
                        <div className="text-xs text-yellow-600">Finsafe Limited - Utility Account</div>
                      </div>
                    </div>
                    <div className="text-sm text-yellow-800">KES 88,442</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-green-800">Balance Recovery</div>
                        <div className="text-xs text-green-600">Kulman Group Limited - Working Account</div>
                      </div>
                    </div>
                    <div className="text-sm text-green-800">KES 105,851</div>
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