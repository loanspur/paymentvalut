'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Building2,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  Settings,
  Bell,
  Clock
} from 'lucide-react'

interface BalanceHistory {
  id: string
  partner_id: string
  disbursement_id: string | null
  balance_type: 'working' | 'utility' | 'charges' | 'total'
  balance_amount: number
  transaction_type: 'disbursement' | 'callback' | 'manual'
  transaction_reference: string | null
  balance_before: number | null
  balance_after: number | null
  change_amount: number
  created_at: string
  partner_name?: string
}

interface Partner {
  id: string
  name: string
  short_code: string
}

interface BalanceMonitoringConfig {
  id: string
  partner_id: string
  working_account_threshold?: number
  utility_account_threshold?: number
  charges_account_threshold?: number
  low_balance_threshold?: number // For partner_balance_configs schema
  unusual_drop_threshold?: number
  unusual_drop_percentage?: number
  check_interval_minutes: number
  slack_webhook_url: string | null
  slack_channel: string | null
  is_enabled?: boolean
  is_monitoring_enabled?: boolean // For partner_balance_configs schema
  last_checked_at: string | null
  last_alert_sent_at: string | null
  partner_name?: string
}

interface BalanceAlert {
  id: string
  partner_id: string
  alert_type: string
  account_type: string
  current_balance: number
  threshold_balance: number
  alert_message: string
  slack_sent: boolean
  resolved_at: string | null
  created_at: string
  partner_name?: string
}

export default function BalanceMonitoringPage() {
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([])
  const [monitoringConfigs, setMonitoringConfigs] = useState<BalanceMonitoringConfig[]>([])
  const [balanceAlerts, setBalanceAlerts] = useState<BalanceAlert[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('history')
  const [searchTerm, setSearchTerm] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('all')
  const [balanceTypeFilter, setBalanceTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<BalanceMonitoringConfig | null>(null)
  const [configForm, setConfigForm] = useState({
    partner_id: '',
    working_account_threshold: 1000,
    utility_account_threshold: 500,
    charges_account_threshold: 200,
    check_interval_minutes: 30,
    slack_webhook_url: '',
    slack_channel: '#mpesa-alerts',
    is_enabled: true
  })
  
  // Cache which table exists to avoid repeated queries (using ref for synchronous access)
  const tableExistsCache = useRef<{
    balance_monitoring_config: boolean | null
    partner_balance_configs: boolean | null
  }>({
    balance_monitoring_config: null,
    partner_balance_configs: null
  })
  
  // Notification system
  const { notifications, addNotification, removeNotification } = useNotifications()

  // Helper function to check which table exists
  const checkTableExists = async (tableName: string): Promise<boolean> => {
    // Check cache first - return immediately if cached
    if (tableExistsCache.current[tableName as keyof typeof tableExistsCache.current] !== null) {
      console.log(`📋 Using cached result for ${tableName}: ${tableExistsCache.current[tableName as keyof typeof tableExistsCache.current]}`)
      return tableExistsCache.current[tableName as keyof typeof tableExistsCache.current]!
    }

    console.log(`🔍 Checking if ${tableName} table exists...`)
    
    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1)

      const exists = !error || error.code !== 'PGRST205'
      
      console.log(`📊 Table ${tableName} exists: ${exists}`)
      
      // Cache the result synchronously
      tableExistsCache.current[tableName as keyof typeof tableExistsCache.current] = exists

      return exists
    } catch (error) {
      console.log(`❌ Error checking ${tableName}: ${error}`)
      // Cache as false if there's an error
      tableExistsCache.current[tableName as keyof typeof tableExistsCache.current] = false
      return false
    }
  }

  useEffect(() => {
    // Initialize table existence check
    const initializeTableCheck = async () => {
      await checkTableExists('balance_monitoring_config')
    }
    
    initializeTableCheck()
    fetchBalanceHistory()
    fetchMonitoringConfigs()
    fetchBalanceAlerts()
    fetchPartners()
  }, [])

  const fetchBalanceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('mpesa_balance_history')
        .select(`
          *,
          partners:partner_id (
            name,
            short_code
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching balance history:', error)
        addNotification({
          type: 'error',
          title: 'Database Error',
          message: 'Failed to fetch balance history'
        })
        return
      }

      // Transform data to include partner name
      const transformedData = data?.map(item => ({
        ...item,
        partner_name: item.partners?.name || 'Unknown Partner'
      })) || []

      setBalanceHistory(transformedData)
    } catch (error) {
      console.error('Error fetching balance history:', error)
      addNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to connect to database'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMonitoringConfigs = async () => {
    try {
      // Check which table exists using cached result
      const balanceMonitoringConfigExists = await checkTableExists('balance_monitoring_config')
      
      if (!balanceMonitoringConfigExists) {
        // Use partner_balance_configs
        console.log('✅ Using partner_balance_configs table (balance_monitoring_config not found)')
        const result = await supabase
          .from('partner_balance_configs')
          .select(`
            *,
            partners:partner_id (
              name
            )
          `)
          .order('created_at', { ascending: false })
        
        if (result.error) {
          console.error('Error fetching monitoring configs from partner_balance_configs:', result.error)
          // If partner_balance_configs also doesn't exist, set empty array
          if (result.error.code === 'PGRST205') {
            console.log('⚠️ Neither balance_monitoring_config nor partner_balance_configs tables exist')
            setMonitoringConfigs([])
            return
          }
          return
        }

        const transformedData = result.data?.map(item => ({
          ...item,
          partner_name: item.partners?.name || 'Unknown Partner'
        })) || []

        setMonitoringConfigs(transformedData)
      } else {
        // Use balance_monitoring_config
        console.log('✅ Using balance_monitoring_config table')
        const result = await supabase
        .from('balance_monitoring_config')
        .select(`
          *,
          partners:partner_id (
            name
          )
        `)
        .order('created_at', { ascending: false })

        if (result.error) {
          console.error('Error fetching monitoring configs:', result.error)
        return
      }

        const transformedData = result.data?.map(item => ({
        ...item,
        partner_name: item.partners?.name || 'Unknown Partner'
      })) || []

      setMonitoringConfigs(transformedData)
      }
    } catch (error) {
      console.error('Error fetching monitoring configs:', error)
    }
  }

  const fetchBalanceAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('balance_alerts')
        .select(`
          *,
          partners:partner_id (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching balance alerts:', error)
        return
      }

      const transformedData = data?.map(item => ({
        ...item,
        partner_name: item.partners?.name || 'Unknown Partner'
      })) || []

      setBalanceAlerts(transformedData)
    } catch (error) {
      console.error('Error fetching balance alerts:', error)
    }
  }

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, short_code')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching partners:', error)
        return
      }

      setPartners(data || [])
    } catch (error) {
      console.error('Error fetching partners:', error)
    }
  }

  const runBalanceCheck = async () => {
    try {
      const response = await fetch('/api/balance-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      
      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Balance Check Completed',
          message: `Checked ${result.results.length} partners`
        })
        
        // Refresh data
        fetchMonitoringConfigs()
        fetchBalanceAlerts()
      } else {
        addNotification({
          type: 'error',
          title: 'Balance Check Failed',
          message: result.message || 'Unknown error'
        })
      }
    } catch (error) {
      console.error('Error running balance check:', error)
      addNotification({
        type: 'error',
        title: 'Balance Check Failed',
        message: 'Failed to run balance check'
      })
    }
  }

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Determine which table to use based on what exists
      let tableName = 'balance_monitoring_config'
      let configData: any = {
        partner_id: configForm.partner_id,
        working_account_threshold: configForm.working_account_threshold,
        utility_account_threshold: configForm.utility_account_threshold,
        charges_account_threshold: configForm.charges_account_threshold,
        check_interval_minutes: configForm.check_interval_minutes,
        slack_webhook_url: configForm.slack_webhook_url || null,
        slack_channel: configForm.slack_channel || null,
        is_enabled: configForm.is_enabled
      }

      // Check which table exists using cached result
      const balanceMonitoringConfigExists = await checkTableExists('balance_monitoring_config')

      if (!balanceMonitoringConfigExists) {
        // Table doesn't exist, use partner_balance_configs with different schema
        tableName = 'partner_balance_configs'
        configData = {
          partner_id: configForm.partner_id,
          check_interval_minutes: configForm.check_interval_minutes,
          low_balance_threshold: configForm.working_account_threshold, // Map to low_balance_threshold
          unusual_drop_threshold: 5000, // Default value
          unusual_drop_percentage: 20, // Default value
          slack_webhook_url: configForm.slack_webhook_url || null,
          slack_channel: configForm.slack_channel || null,
          is_monitoring_enabled: configForm.is_enabled,
          notify_on_low_balance: true,
          notify_on_unusual_drop: true,
          notify_on_balance_recovery: true
        }
      }

      // Check if configuration already exists for this partner
      const { data: existingConfig, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .eq('partner_id', configForm.partner_id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingConfig || editingConfig) {
        // Update existing configuration
        const updateData = {
          ...configData,
          updated_at: new Date().toISOString()
        }
        
        // Remove partner_id from update data to avoid conflicts
        delete updateData.partner_id

        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', editingConfig?.id || existingConfig.id)

        if (error) throw error

        addNotification({
          type: 'success',
          title: 'Configuration Updated',
          message: 'Balance monitoring configuration has been updated successfully'
        })
      } else {
        // Create new configuration
        const { error } = await supabase
          .from(tableName)
          .insert(configData)

        if (error) throw error

        addNotification({
          type: 'success',
          title: 'Configuration Created',
          message: 'Balance monitoring configuration has been created successfully'
        })
      }

      // Reset form and close modal
      setConfigForm({
        partner_id: '',
        working_account_threshold: 1000,
        utility_account_threshold: 500,
        charges_account_threshold: 200,
        check_interval_minutes: 30,
        slack_webhook_url: '',
        slack_channel: '#mpesa-alerts',
        is_enabled: true
      })
      setShowConfigModal(false)
      setEditingConfig(null)
      
      // Refresh data
      fetchMonitoringConfigs()
    } catch (error) {
      console.error('Error saving configuration:', error)
      addNotification({
        type: 'error',
        title: 'Configuration Error',
        message: 'Failed to save balance monitoring configuration'
      })
    }
  }

  const editConfig = (config: BalanceMonitoringConfig) => {
    setEditingConfig(config)
    setConfigForm({
      partner_id: config.partner_id,
      working_account_threshold: config.working_account_threshold || config.low_balance_threshold || 1000,
      utility_account_threshold: config.utility_account_threshold || 500,
      charges_account_threshold: config.charges_account_threshold || 200,
      check_interval_minutes: config.check_interval_minutes,
      slack_webhook_url: config.slack_webhook_url || '',
      slack_channel: config.slack_channel || '#mpesa-alerts',
      is_enabled: config.is_enabled || config.is_monitoring_enabled || true
    })
    setShowConfigModal(true)
  }

  const toggleConfig = async (configId: string, isEnabled: boolean) => {
    try {
      // Check which table exists using cached result
      const balanceMonitoringConfigExists = await checkTableExists('balance_monitoring_config')

      if (!balanceMonitoringConfigExists) {
        // Use partner_balance_configs
        const { error } = await supabase
          .from('partner_balance_configs')
          .update({ 
            is_monitoring_enabled: isEnabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId)

        if (error) throw error
      } else {
        // Use balance_monitoring_config
        const { error } = await supabase
          .from('balance_monitoring_config')
          .update({ 
            is_enabled: isEnabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId)

        if (error) throw error
      }

      addNotification({
        type: 'success',
        title: 'Configuration Updated',
        message: `Balance monitoring ${isEnabled ? 'enabled' : 'disabled'} successfully`
      })

      // Refresh data
      fetchMonitoringConfigs()
    } catch (error) {
      console.error('Error toggling configuration:', error)
      addNotification({
        type: 'error',
        title: 'Configuration Error',
        message: 'Failed to update balance monitoring configuration'
      })
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('balance_alerts')
        .update({ 
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId)

      if (error) throw error

      addNotification({
        type: 'success',
        title: 'Alert Resolved',
        message: 'Balance alert has been resolved successfully'
      })

      // Refresh data
      fetchBalanceAlerts()
    } catch (error) {
      console.error('Error resolving alert:', error)
      addNotification({
        type: 'error',
        title: 'Alert Error',
        message: 'Failed to resolve balance alert'
      })
    }
  }

  // Filter balance history
  const filteredBalanceHistory = balanceHistory.filter(item => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        item.partner_name.toLowerCase().includes(searchLower) ||
        item.transaction_reference?.toLowerCase().includes(searchLower) ||
        item.balance_type.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Partner filter
    if (partnerFilter !== 'all' && item.partner_id !== partnerFilter) {
      return false
    }

    // Balance type filter
    if (balanceTypeFilter !== 'all' && item.balance_type !== balanceTypeFilter) {
      return false
    }

    // Date filter
    if (dateFilter !== 'all') {
      const itemDate = new Date(item.created_at)
      const now = new Date()
      
      switch (dateFilter) {
        case 'today':
          if (itemDate.toDateString() !== now.toDateString()) return false
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (itemDate < weekAgo) return false
          break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (itemDate < monthAgo) return false
          break
      }
    }

    return true
  })

  // Get unique partner names for filter
  const partnerNames = Array.from(new Set(partners.map(p => p.name))).sort()

  // Calculate summary statistics
  const stats = {
    totalEntries: filteredBalanceHistory.length,
    workingAccount: filteredBalanceHistory
      .filter(item => item.balance_type === 'working')
      .reduce((sum, item) => sum + (item.balance_amount || 0), 0),
    utilityAccount: filteredBalanceHistory
      .filter(item => item.balance_type === 'utility')
      .reduce((sum, item) => sum + (item.balance_amount || 0), 0),
    chargesAccount: filteredBalanceHistory
      .filter(item => item.balance_type === 'charges')
      .reduce((sum, item) => sum + (item.balance_amount || 0), 0)
  }

  const getBalanceTypeColor = (type: string) => {
    switch (type) {
      case 'working':
        return 'bg-blue-100 text-blue-800'
      case 'utility':
        return 'bg-green-100 text-green-800'
      case 'charges':
        return 'bg-yellow-100 text-yellow-800'
      case 'total':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">M-Pesa Balance Monitoring</h1>
          <p className="mt-2 text-gray-600">Track account balances, alerts, and monitoring configuration</p>
        </div>
        <div className="flex space-x-3">
          <a
            href="/"
            className="btn btn-secondary"
          >
            ← Back to Dashboard
          </a>
          <button
            onClick={runBalanceCheck}
            className="btn bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Bell className="w-4 h-4 mr-2" />
            Run Check
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="btn btn-primary"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Balance History
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Alerts ({balanceAlerts.filter(a => !a.resolved_at).length})
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'monitoring'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Monitoring Config
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Working Account</p>
              <p className="text-2xl font-semibold text-gray-900">
                KES {stats.workingAccount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Utility Account</p>
              <p className="text-2xl font-semibold text-gray-900">
                KES {stats.utilityAccount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Charges Account</p>
              <p className="text-2xl font-semibold text-gray-900">
                KES {stats.chargesAccount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Entries</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalEntries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by partner, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? ' ↑' : ' ↓'}
            </button>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredBalanceHistory.length} of {balanceHistory.length} entries
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Partner Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner
                </label>
                <select
                  value={partnerFilter}
                  onChange={(e) => setPartnerFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Partners</option>
                  {partnerNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Balance Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={balanceTypeFilter}
                  onChange={(e) => setBalanceTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="working">Working Account</option>
                  <option value="utility">Utility Account</option>
                  <option value="charges">Charges Account</option>
                  <option value="total">Total Balance</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setPartnerFilter('all')
                  setBalanceTypeFilter('all')
                  setDateFilter('all')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Balance History Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBalanceHistory.length > 0 ? (
                filteredBalanceHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.partner_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBalanceTypeColor(item.balance_type)}`}>
                        {item.balance_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      KES {item.balance_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {getChangeIcon(item.change_amount)}
                        <span className={`ml-1 ${item.change_amount > 0 ? 'text-green-600' : item.change_amount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {item.change_amount > 0 ? '+' : ''}{item.change_amount.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="capitalize">{item.transaction_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.transaction_reference || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <DollarSign className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No balance history found</h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm || partnerFilter !== 'all' || balanceTypeFilter !== 'all' || dateFilter !== 'all'
                          ? 'Try adjusting your search criteria or filters.'
                          : 'No balance history has been recorded yet.'}
                      </p>
                      {(searchTerm || partnerFilter !== 'all' || balanceTypeFilter !== 'all' || dateFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setPartnerFilter('all')
                            setBalanceTypeFilter('all')
                            setDateFilter('all')
                          }}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

  {/* Alerts Tab */}
  {activeTab === 'alerts' && (
    <div className="space-y-6">
      {/* Alerts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {balanceAlerts.filter(a => !a.resolved_at).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Bell className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Slack Sent</p>
              <p className="text-2xl font-semibold text-gray-900">
                {balanceAlerts.filter(a => a.slack_sent).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-semibold text-gray-900">
                {balanceAlerts.filter(a => a.resolved_at).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alert Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {balanceAlerts.length > 0 ? (
                balanceAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {alert.partner_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        alert.alert_type === 'low_balance' ? 'bg-red-100 text-red-800' :
                        alert.alert_type === 'critical_balance' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.alert_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {alert.account_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      KES {alert.current_balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      KES {alert.threshold_balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {alert.slack_sent && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mr-2">
                            Slack Sent
                          </span>
                        )}
                        {alert.resolved_at ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {!alert.resolved_at && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <AlertTriangle className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
                      <p className="text-gray-500">No balance alerts have been triggered yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* Monitoring Config Tab */}
  {activeTab === 'monitoring' && (
    <div className="space-y-6">
      {/* Config Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Configs</p>
              <p className="text-2xl font-semibold text-gray-900">{monitoringConfigs.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bell className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Enabled</p>
              <p className="text-2xl font-semibold text-gray-900">
                {monitoringConfigs.filter(c => c.is_enabled || c.is_monitoring_enabled).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Interval</p>
              <p className="text-2xl font-semibold text-gray-900">
                {monitoringConfigs.length > 0 
                  ? Math.round(monitoringConfigs.reduce((sum, c) => sum + c.check_interval_minutes, 0) / monitoringConfigs.length)
                  : 0} min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Configs Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Working Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utility Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charges Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Interval
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Check
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monitoringConfigs.length > 0 ? (
                monitoringConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {config.partner_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      KES {(config.working_account_threshold || config.low_balance_threshold || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      KES {(config.utility_account_threshold || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      KES {(config.charges_account_threshold || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.check_interval_minutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (config.is_enabled || config.is_monitoring_enabled) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {(config.is_enabled || config.is_monitoring_enabled) ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {config.last_checked_at 
                        ? format(new Date(config.last_checked_at), 'MMM dd, yyyy HH:mm')
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => editConfig(config)}
                        className="text-blue-600 hover:text-blue-900 font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleConfig(config.id, !(config.is_enabled || config.is_monitoring_enabled))}
                        className={`font-medium ${
                          (config.is_enabled || config.is_monitoring_enabled)
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {(config.is_enabled || config.is_monitoring_enabled) ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Settings className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No monitoring configurations</h3>
                      <p className="text-gray-500 mb-4">Set up balance monitoring for your partners.</p>
                      <button
                        onClick={() => setShowConfigModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Add Configuration
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* Configuration Modal */}
  {showConfigModal && (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingConfig ? 'Edit' : 'Add'} Balance Monitoring Configuration
            </h3>
            <button
              onClick={() => {
                setShowConfigModal(false)
                setEditingConfig(null)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Partner
              </label>
              <select
                value={configForm.partner_id}
                onChange={(e) => setConfigForm({...configForm, partner_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select a partner</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Account Threshold (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={configForm.working_account_threshold}
                  onChange={(e) => setConfigForm({...configForm, working_account_threshold: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utility Account Threshold (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={configForm.utility_account_threshold}
                  onChange={(e) => setConfigForm({...configForm, utility_account_threshold: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charges Account Threshold (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={configForm.charges_account_threshold}
                  onChange={(e) => setConfigForm({...configForm, charges_account_threshold: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check Interval (minutes)
              </label>
              <select
                value={configForm.check_interval_minutes}
                onChange={(e) => setConfigForm({...configForm, check_interval_minutes: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
                <option value={480}>8 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={configForm.slack_webhook_url}
                onChange={(e) => setConfigForm({...configForm, slack_webhook_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Channel
              </label>
              <input
                type="text"
                value={configForm.slack_channel}
                onChange={(e) => setConfigForm({...configForm, slack_channel: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="#mpesa-alerts"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_enabled"
                checked={configForm.is_enabled}
                onChange={(e) => setConfigForm({...configForm, is_enabled: e.target.checked})}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_enabled" className="ml-2 block text-sm text-gray-900">
                Enable monitoring
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowConfigModal(false)
                  setEditingConfig(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingConfig ? 'Update' : 'Create'} Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )}
    </div>
  )
}